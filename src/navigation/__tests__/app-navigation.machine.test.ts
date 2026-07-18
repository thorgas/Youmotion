import { createActor, waitFor, type Actor } from 'xstate';

import {
  APP_ROUTES,
  APP_LOCALES,
  CHECK_IN_EVENTS,
  CHECK_IN_STATES,
  EMOTION_LABEL_MODES,
  EMOTION_IDS,
  BELIEF_SYSTEM_IDS,
  NAVIGATION_EVENTS,
  NAVIGATION_STATES,
  SETTINGS_EVENTS,
} from '@/constants';
import {
  CheckInId,
  CheckInTimestamp,
  type CheckIn,
  type EmotionSelection,
} from '@/features/check-in/domain/check-in';
import { checkInHistoryStore } from '@/features/check-in/application/check-in-history.store';
import { appSettingsStore } from '@/features/settings/application/app-settings.store';
import {
  failNextSurrealDelete,
  failNextSurrealUpsert,
  mockSurrealDatabase,
  mockSurrealQuery,
  resetSurrealDatabaseMock,
} from '@/test-utils/surrealdb.repository.mock';
import { appNavigationMachine, routeForStateValue } from '../app-navigation.machine';

jest.mock('@/features/check-in/infrastructure/surrealdb.database', () => ({
  getDatabase: jest.fn(() => Promise.resolve(mockSurrealDatabase)),
}));

const selection = {
  emotionId: EMOTION_IDS.JOY,
  intensity: 0.42,
  level: 2,
  color: '#E7AD32',
} satisfies EmotionSelection;

const hydrationSentinel = {
  id: CheckInId.make('hydration-sentinel'),
  createdAt: CheckInTimestamp.make('2026-07-18T00:00:00.000Z'),
  emotionId: EMOTION_IDS.JOY,
  intensity: 0.5,
  note: '',
} satisfies CheckIn;

async function startAfterInitialHistoryHydration() {
  checkInHistoryStore.trigger.hydrated({ entries: [hydrationSentinel] });
  const actor = createActor(appNavigationMachine).start();
  await waitFor(
    actor,
    () => checkInHistoryStore.getSnapshot().context.entries.length === 0,
    { timeout: 1_000 },
  );
  return actor;
}

async function finishWithoutBeliefSystem(actor: Actor<typeof appNavigationMachine>) {
  await waitFor(
    actor,
    (candidate) => candidate.matches(CHECK_IN_STATES.BELIEF_SYSTEM),
    { timeout: 1_000 },
  );
  actor.send({ type: CHECK_IN_EVENTS.CONFIRMED });
  return waitFor(
    actor,
    (candidate) => candidate.matches(CHECK_IN_STATES.SUCCESS),
    { timeout: 1_000 },
  );
}

describe('app navigation model', () => {
  beforeEach(() => {
    resetSurrealDatabaseMock();
    checkInHistoryStore.trigger.hydrated({ entries: [] });
    appSettingsStore.trigger.hydrated({
      settings: {
        locale: APP_LOCALES.ENGLISH,
        emotionLabelMode: EMOTION_LABEL_MODES.EMOJI,
      },
    });
  });

  it('makes tab navigation an explicit state graph', () => {
    const actor = createActor(appNavigationMachine).start();
    expect(routeForStateValue(actor.getSnapshot().value)).toBe(APP_ROUTES.TODAY);

    actor.send({ type: NAVIGATION_EVENTS.HISTORY_OPENED });
    expect(actor.getSnapshot().matches({ [NAVIGATION_STATES.TABS]: NAVIGATION_STATES.HISTORY })).toBe(true);
    expect(routeForStateValue(actor.getSnapshot().value)).toBe(APP_ROUTES.HISTORY);

    actor.send({ type: NAVIGATION_EVENTS.SETTINGS_OPENED });
    expect(routeForStateValue(actor.getSnapshot().value)).toBe(APP_ROUTES.SETTINGS);

    actor.send({ type: NAVIGATION_EVENTS.TODAY_OPENED });
    expect(routeForStateValue(actor.getSnapshot().value)).toBe(APP_ROUTES.TODAY);
  });

  it('models all emotion-label setting choices', () => {
    const actor = createActor(appNavigationMachine).start();

    actor.send({ type: SETTINGS_EVENTS.EMOTION_LABEL_MODE_CHANGED, mode: EMOTION_LABEL_MODES.TEXT });
    expect(appSettingsStore.getSnapshot().context.emotionLabelMode).toBe(EMOTION_LABEL_MODES.TEXT);

    actor.send({ type: SETTINGS_EVENTS.EMOTION_LABEL_MODE_CHANGED, mode: EMOTION_LABEL_MODES.BOTH });
    expect(appSettingsStore.getSnapshot().context.emotionLabelMode).toBe(EMOTION_LABEL_MODES.BOTH);

    actor.send({ type: SETTINGS_EVENTS.EMOTION_LABEL_MODE_CHANGED, mode: EMOTION_LABEL_MODES.EMOJI });
    expect(appSettingsStore.getSnapshot().context.emotionLabelMode).toBe(EMOTION_LABEL_MODES.EMOJI);
  });

  it('models and persists both supported languages', () => {
    const actor = createActor(appNavigationMachine).start();

    actor.send({ type: SETTINGS_EVENTS.LANGUAGE_CHANGED, locale: APP_LOCALES.GERMAN });
    expect(appSettingsStore.getSnapshot().context.locale).toBe(APP_LOCALES.GERMAN);

    actor.send({ type: SETTINGS_EVENTS.LANGUAGE_CHANGED, locale: APP_LOCALES.ENGLISH });
    expect(appSettingsStore.getSnapshot().context.locale).toBe(APP_LOCALES.ENGLISH);
  });

  it('hydrates every app setting from SurrealDB on startup', async () => {
    mockSurrealQuery.mockImplementation(async (surql) => [{
      statementIndex: 0,
      value: surql.startsWith('SELECT locale, emotionLabelMode')
        ? [{
            locale: APP_LOCALES.GERMAN,
            emotionLabelMode: EMOTION_LABEL_MODES.BOTH,
          }]
        : [],
    }]);

    const actor = createActor(appNavigationMachine).start();
    await waitFor(
      actor,
      () => appSettingsStore.getSnapshot().context.locale === APP_LOCALES.GERMAN,
      { timeout: 1_000 },
    );

    expect(appSettingsStore.getSnapshot().context).toMatchObject({
      locale: APP_LOCALES.GERMAN,
      emotionLabelMode: EMOTION_LABEL_MODES.BOTH,
      hydrated: true,
    });
  });

  it('reaches reflection only through a valid star interaction', () => {
    const actor = createActor(appNavigationMachine).start();
    actor.send({ type: CHECK_IN_EVENTS.TOUCH_STARTED });
    actor.send({ type: CHECK_IN_EVENTS.SELECTION_RELEASED });
    expect(routeForStateValue(actor.getSnapshot().value)).toBe(APP_ROUTES.TODAY);

    actor.send({ type: CHECK_IN_EVENTS.TOUCH_STARTED });
    actor.send({ type: CHECK_IN_EVENTS.SELECTION_CHANGED, selection });
    expect(actor.getSnapshot().matches({
      [NAVIGATION_STATES.TABS]: {
        [NAVIGATION_STATES.TODAY]: CHECK_IN_STATES.EXPLORING,
      },
    })).toBe(true);
    expect(routeForStateValue(actor.getSnapshot().value)).toBe(APP_ROUTES.TODAY);
    actor.send({ type: CHECK_IN_EVENTS.SELECTION_RELEASED });
    expect(actor.getSnapshot().matches(NAVIGATION_STATES.REFLECTION)).toBe(true);
    expect(routeForStateValue(actor.getSnapshot().value)).toBe(APP_ROUTES.REFLECTION);

    actor.send({ type: CHECK_IN_EVENTS.NOTE_CHANGED, note: 'a'.repeat(300) });
    expect(actor.getSnapshot().context.note).toHaveLength(240);
    actor.send({ type: CHECK_IN_EVENTS.CONFIRMED });
    expect(actor.getSnapshot().matches(CHECK_IN_STATES.SAVING)).toBe(true);
  });

  it('cancels an interrupted drag without selecting its preview', () => {
    const actor = createActor(appNavigationMachine).start();
    actor.send({ type: CHECK_IN_EVENTS.TOUCH_STARTED });
    actor.send({ type: CHECK_IN_EVENTS.SELECTION_CHANGED, selection });
    actor.send({ type: CHECK_IN_EVENTS.SELECTION_CANCELLED });

    expect(actor.getSnapshot().matches({
      [NAVIGATION_STATES.TABS]: {
        [NAVIGATION_STATES.TODAY]: CHECK_IN_STATES.IDLE,
      },
    })).toBe(true);
    expect(actor.getSnapshot().context.selection).toBeNull();
    expect(routeForStateValue(actor.getSnapshot().value)).toBe(APP_ROUTES.TODAY);
  });

  it('saves the reflection before offering and attaching a core belief', async () => {
    const actor = createActor(appNavigationMachine).start();
    actor.send({ type: CHECK_IN_EVENTS.TOUCH_STARTED });
    actor.send({ type: CHECK_IN_EVENTS.SELECTION_CHANGED, selection });
    actor.send({ type: CHECK_IN_EVENTS.SELECTION_RELEASED });
    actor.send({ type: CHECK_IN_EVENTS.NOTE_CHANGED, note: 'A bright moment' });
    actor.send({ type: CHECK_IN_EVENTS.CONFIRMED });

    const savedReflection = await waitFor(
      actor,
      (candidate) => candidate.matches(CHECK_IN_STATES.BELIEF_SYSTEM),
      { timeout: 1_000 },
    );
    expect(savedReflection.context.saved).toMatchObject({
      note: 'A bright moment',
    });
    expect(savedReflection.context.saved?.beliefSystemId).toBeUndefined();
    expect(routeForStateValue(savedReflection.value)).toBe(APP_ROUTES.REFLECTION);

    actor.send({ type: CHECK_IN_EVENTS.BELIEF_SYSTEM_CATALOG_REQUESTED });
    expect(actor.getSnapshot().matches(CHECK_IN_STATES.BELIEF_SYSTEM_CATALOG)).toBe(true);
    actor.send({
      type: CHECK_IN_EVENTS.BELIEF_SYSTEM_CHANGED,
      beliefSystemId: BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING,
    });
    expect(actor.getSnapshot().matches(CHECK_IN_STATES.BELIEF_SYSTEM)).toBe(true);
    actor.send({ type: CHECK_IN_EVENTS.CONFIRMED });

    const snapshot = await waitFor(
      actor,
      (candidate) => candidate.matches(CHECK_IN_STATES.SUCCESS),
      { timeout: 1_000 },
    );

    expect(routeForStateValue(snapshot.value)).toBe(APP_ROUTES.SUCCESS);
    expect(snapshot.context.saved?.emotionId).toBe(EMOTION_IDS.JOY);
    expect(snapshot.context.saved?.beliefSystemId).toBe(BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING);
  });

  it('persists a custom core belief and guiding belief through retryable model states', async () => {
    const actor = createActor(appNavigationMachine).start();
    actor.send({ type: CHECK_IN_EVENTS.TOUCH_STARTED });
    actor.send({ type: CHECK_IN_EVENTS.SELECTION_CHANGED, selection });
    actor.send({ type: CHECK_IN_EVENTS.SELECTION_RELEASED });
    actor.send({ type: CHECK_IN_EVENTS.CONFIRMED });
    await waitFor(
      actor,
      (candidate) => candidate.matches(CHECK_IN_STATES.BELIEF_SYSTEM),
      { timeout: 1_000 },
    );

    actor.send({ type: CHECK_IN_EVENTS.BELIEF_SYSTEM_CATALOG_REQUESTED });
    actor.send({ type: CHECK_IN_EVENTS.CUSTOM_BELIEF_SYSTEM_REQUESTED });
    expect(actor.getSnapshot().matches(CHECK_IN_STATES.BELIEF_SYSTEM_EDITOR)).toBe(true);
    expect(routeForStateValue(actor.getSnapshot().value)).toBe(APP_ROUTES.REFLECTION);
    actor.send({
      type: CHECK_IN_EVENTS.BELIEF_SYSTEM_DRAFT_CHANGED,
      statement: 'I must always function.',
    });
    actor.send({
      type: CHECK_IN_EVENTS.GUIDING_BELIEF_SYSTEM_DRAFT_CHANGED,
      statement: 'I may pause and I am still loved.',
    });
    failNextSurrealUpsert(new Error('belief storage unavailable'));
    actor.send({ type: CHECK_IN_EVENTS.BELIEF_SYSTEM_EDITOR_CONFIRMED });

    await waitFor(
      actor,
      (candidate) => candidate.matches(CHECK_IN_STATES.BELIEF_STATEMENT_FAILURE),
      { timeout: 1_000 },
    );
    actor.send({ type: CHECK_IN_EVENTS.RETRIED });
    const persisted = await waitFor(
      actor,
      (candidate) => candidate.matches(CHECK_IN_STATES.BELIEF_SYSTEM),
      { timeout: 1_000 },
    );
    const selectedId = persisted.context.beliefSystemId;
    expect(selectedId).toEqual(expect.stringMatching(/^custom-/));
    expect(persisted.context.beliefStatements).toContainEqual({
      kind: 'custom',
      beliefSystemId: selectedId,
      harmfulStatement: 'I must always function.',
      guidingStatement: 'I may pause and I am still loved.',
    });

    actor.send({ type: CHECK_IN_EVENTS.CONFIRMED });
    const completed = await waitFor(
      actor,
      (candidate) => candidate.matches(CHECK_IN_STATES.SUCCESS),
      { timeout: 1_000 },
    );
    expect(completed.context.saved?.beliefSystemId).toBe(selectedId);
  });

  it('adds a guiding belief to a built-in core belief', async () => {
    const actor = createActor(appNavigationMachine).start();
    actor.send({ type: CHECK_IN_EVENTS.TOUCH_STARTED });
    actor.send({ type: CHECK_IN_EVENTS.SELECTION_CHANGED, selection });
    actor.send({ type: CHECK_IN_EVENTS.SELECTION_RELEASED });
    actor.send({ type: CHECK_IN_EVENTS.CONFIRMED });
    await waitFor(
      actor,
      (candidate) => candidate.matches(CHECK_IN_STATES.BELIEF_SYSTEM),
      { timeout: 1_000 },
    );
    actor.send({
      type: CHECK_IN_EVENTS.BELIEF_SYSTEM_CHANGED,
      beliefSystemId: BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING,
    });
    actor.send({ type: CHECK_IN_EVENTS.GUIDING_BELIEF_SYSTEM_REQUESTED });
    actor.send({
      type: CHECK_IN_EVENTS.GUIDING_BELIEF_SYSTEM_DRAFT_CHANGED,
      statement: 'I may pause and I am still loved.',
    });
    actor.send({ type: CHECK_IN_EVENTS.BELIEF_SYSTEM_EDITOR_CONFIRMED });

    const persisted = await waitFor(
      actor,
      (candidate) => candidate.matches(CHECK_IN_STATES.BELIEF_SYSTEM),
      { timeout: 1_000 },
    );
    expect(persisted.context.beliefStatements).toContainEqual({
      kind: 'built-in',
      beliefSystemId: BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING,
      guidingStatement: 'I may pause and I am still loved.',
    });
  });

  it('deletes a persisted check-in through the root actor', async () => {
    const actor = await startAfterInitialHistoryHydration();
    actor.send({ type: CHECK_IN_EVENTS.TOUCH_STARTED });
    actor.send({ type: CHECK_IN_EVENTS.SELECTION_CHANGED, selection });
    actor.send({ type: CHECK_IN_EVENTS.SELECTION_RELEASED });
    actor.send({ type: CHECK_IN_EVENTS.CONFIRMED });

    const created = await finishWithoutBeliefSystem(actor);
    const saved = created.context.saved;
    if (!saved) throw new Error('Successful persistence must expose the saved check-in.');

    checkInHistoryStore.trigger.hydrated({ entries: [saved] });
    actor.send({ type: CHECK_IN_EVENTS.DELETE_REQUESTED, id: saved.id });
    await waitFor(
      actor,
      () => checkInHistoryStore.getSnapshot().context.entries.length === 0,
      { timeout: 1_000 },
    );

    expect(checkInHistoryStore.getSnapshot().context.entries).toEqual([]);
  });

  it('keeps a check-in visible when deletion fails', async () => {
    const actor = await startAfterInitialHistoryHydration();
    actor.send({ type: CHECK_IN_EVENTS.TOUCH_STARTED });
    actor.send({ type: CHECK_IN_EVENTS.SELECTION_CHANGED, selection });
    actor.send({ type: CHECK_IN_EVENTS.SELECTION_RELEASED });
    actor.send({ type: CHECK_IN_EVENTS.CONFIRMED });

    const created = await finishWithoutBeliefSystem(actor);
    const saved = created.context.saved;
    if (!saved) throw new Error('Successful persistence must expose the saved check-in.');

    checkInHistoryStore.trigger.hydrated({ entries: [saved] });
    failNextSurrealDelete(new Error('delete unavailable'));
    actor.send({ type: CHECK_IN_EVENTS.DELETE_REQUESTED, id: saved.id });
    await waitFor(
      actor,
      () => checkInHistoryStore.getSnapshot().context.error !== null,
      { timeout: 1_000 },
    );

    expect(checkInHistoryStore.getSnapshot().context.entries).toContainEqual(saved);
    expect(checkInHistoryStore.getSnapshot().context.error).not.toBeNull();
  });

  it('models a storage failure and successful retry', async () => {
    failNextSurrealUpsert(new Error('storage unavailable'));
    const actor = createActor(appNavigationMachine).start();
    actor.send({ type: CHECK_IN_EVENTS.TOUCH_STARTED });
    actor.send({ type: CHECK_IN_EVENTS.SELECTION_CHANGED, selection });
    actor.send({ type: CHECK_IN_EVENTS.SELECTION_RELEASED });
    actor.send({ type: CHECK_IN_EVENTS.CONFIRMED });

    await waitFor(actor, (candidate) => candidate.matches(CHECK_IN_STATES.FAILURE), { timeout: 1_000 });
    actor.send({ type: CHECK_IN_EVENTS.RETRIED });
    const snapshot = await finishWithoutBeliefSystem(actor);

    expect(snapshot.context.error).toBeNull();
  });

  it('keeps the saved reflection when core belief attachment needs a retry', async () => {
    const actor = createActor(appNavigationMachine).start();
    actor.send({ type: CHECK_IN_EVENTS.TOUCH_STARTED });
    actor.send({ type: CHECK_IN_EVENTS.SELECTION_CHANGED, selection });
    actor.send({ type: CHECK_IN_EVENTS.SELECTION_RELEASED });
    actor.send({ type: CHECK_IN_EVENTS.NOTE_CHANGED, note: 'Already safe' });
    actor.send({ type: CHECK_IN_EVENTS.CONFIRMED });
    const reflection = await waitFor(
      actor,
      (candidate) => candidate.matches(CHECK_IN_STATES.BELIEF_SYSTEM),
      { timeout: 1_000 },
    );
    const reflectionId = reflection.context.saved?.id;

    actor.send({
      type: CHECK_IN_EVENTS.BELIEF_SYSTEM_CHANGED,
      beliefSystemId: BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING,
    });
    failNextSurrealUpsert(new Error('attachment unavailable'));
    actor.send({ type: CHECK_IN_EVENTS.CONFIRMED });
    const failure = await waitFor(
      actor,
      (candidate) => candidate.matches(CHECK_IN_STATES.BELIEF_SYSTEM_FAILURE),
      { timeout: 1_000 },
    );
    expect(failure.context.saved).toMatchObject({ id: reflectionId, note: 'Already safe' });

    actor.send({ type: CHECK_IN_EVENTS.RETRIED });
    const completed = await waitFor(
      actor,
      (candidate) => candidate.matches(CHECK_IN_STATES.SUCCESS),
      { timeout: 1_000 },
    );
    expect(completed.context.saved).toMatchObject({
      id: reflectionId,
      beliefSystemId: BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING,
    });
  });

  it('loads, changes, and updates an existing moment without duplicating it', async () => {
    const actor = createActor(appNavigationMachine).start();
    actor.send({ type: CHECK_IN_EVENTS.TOUCH_STARTED });
    actor.send({ type: CHECK_IN_EVENTS.SELECTION_CHANGED, selection });
    actor.send({ type: CHECK_IN_EVENTS.SELECTION_RELEASED });
    actor.send({ type: CHECK_IN_EVENTS.NOTE_CHANGED, note: 'Before' });
    actor.send({ type: CHECK_IN_EVENTS.CONFIRMED });

    const created = await finishWithoutBeliefSystem(actor);
    const saved = created.context.saved;
    if (!saved) throw new Error('Successful persistence must expose the saved check-in.');

    actor.send({ type: CHECK_IN_EVENTS.RESTARTED });
    actor.send({ type: NAVIGATION_EVENTS.HISTORY_OPENED });
    actor.send({ type: CHECK_IN_EVENTS.EDIT_REQUESTED, entry: saved });
    expect(actor.getSnapshot().matches(NAVIGATION_STATES.REFLECTION)).toBe(true);
    expect(actor.getSnapshot().context).toMatchObject({ note: 'Before', editing: saved });

    actor.send({ type: CHECK_IN_EVENTS.EDIT_SELECTION_REQUESTED });
    expect(routeForStateValue(actor.getSnapshot().value)).toBe(APP_ROUTES.TODAY);
    actor.send({ type: CHECK_IN_EVENTS.TOUCH_STARTED });
    actor.send({
      type: CHECK_IN_EVENTS.SELECTION_CHANGED,
      selection: { ...selection, intensity: 0.8, level: 4 },
    });
    actor.send({ type: CHECK_IN_EVENTS.SELECTION_RELEASED });
    actor.send({ type: CHECK_IN_EVENTS.NOTE_CHANGED, note: 'After' });
    actor.send({ type: CHECK_IN_EVENTS.CONFIRMED });
    await waitFor(
      actor,
      (candidate) => candidate.matches(CHECK_IN_STATES.BELIEF_SYSTEM),
      { timeout: 1_000 },
    );
    actor.send({ type: CHECK_IN_EVENTS.CONFIRMED });

    await waitFor(
      actor,
      (candidate) => candidate.matches({ [NAVIGATION_STATES.TABS]: NAVIGATION_STATES.HISTORY }),
      { timeout: 1_000 },
    );
    const entries = checkInHistoryStore.getSnapshot().context.entries;
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      id: saved.id,
      createdAt: saved.createdAt,
      intensity: 0.8,
      level: 4,
      note: 'After',
    });
  });
});
