import { createActor, waitFor } from 'xstate';

import {
  APP_ROUTES,
  CHECK_IN_EVENTS,
  CHECK_IN_STATES,
  EMOTION_IDS,
  NAVIGATION_EVENTS,
  NAVIGATION_STATES,
} from '@/constants';
import type { EmotionSelection } from '@/features/check-in/domain/check-in';
import { checkInHistoryStore } from '@/features/check-in/application/check-in-history.store';
import {
  failNextSurrealUpsert,
  mockSurrealDatabase,
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

describe('app navigation model', () => {
  beforeEach(() => {
    resetSurrealDatabaseMock();
    checkInHistoryStore.trigger.hydrated({ entries: [] });
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

  it('persists through the saving state and reaches success', async () => {
    const actor = createActor(appNavigationMachine).start();
    actor.send({ type: CHECK_IN_EVENTS.TOUCH_STARTED });
    actor.send({ type: CHECK_IN_EVENTS.SELECTION_CHANGED, selection });
    actor.send({ type: CHECK_IN_EVENTS.SELECTION_RELEASED });
    actor.send({ type: CHECK_IN_EVENTS.CONFIRMED });

    const snapshot = await waitFor(
      actor,
      (candidate) => candidate.matches(CHECK_IN_STATES.SUCCESS),
      { timeout: 1_000 },
    );

    expect(routeForStateValue(snapshot.value)).toBe(APP_ROUTES.SUCCESS);
    expect(snapshot.context.saved?.emotionId).toBe(EMOTION_IDS.JOY);
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
    const snapshot = await waitFor(
      actor,
      (candidate) => candidate.matches(CHECK_IN_STATES.SUCCESS),
      { timeout: 1_000 },
    );

    expect(snapshot.context.error).toBeNull();
  });

  it('loads, changes, and updates an existing moment without duplicating it', async () => {
    const actor = createActor(appNavigationMachine).start();
    actor.send({ type: CHECK_IN_EVENTS.TOUCH_STARTED });
    actor.send({ type: CHECK_IN_EVENTS.SELECTION_CHANGED, selection });
    actor.send({ type: CHECK_IN_EVENTS.SELECTION_RELEASED });
    actor.send({ type: CHECK_IN_EVENTS.NOTE_CHANGED, note: 'Before' });
    actor.send({ type: CHECK_IN_EVENTS.CONFIRMED });

    const created = await waitFor(
      actor,
      (candidate) => candidate.matches(CHECK_IN_STATES.SUCCESS),
      { timeout: 1_000 },
    );
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
