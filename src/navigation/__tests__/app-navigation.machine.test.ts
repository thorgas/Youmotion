import { createActor, waitFor, type Actor } from 'xstate';
import * as Effect from 'effect/Effect';

import {
  APP_ROUTES,
  APP_LOCALES,
  BELIEF_LIBRARY_EVENTS,
  BELIEF_LIBRARY_STATES,
  CHECK_IN_EVENTS,
  CHECK_IN_STATES,
  DATA_SAFETY_EVENTS,
  DATA_SAFETY_STATES,
  EMOTION_LABEL_MODES,
  EMOTION_IDS,
  BELIEF_SYSTEM_IDS,
  MAX_NOTE_LENGTH,
  NAVIGATION_EVENTS,
  NAVIGATION_STATES,
  ONBOARDING_ENTRY_POINTS,
  ONBOARDING_EVENTS,
  ONBOARDING_STATES,
  REMINDER_EVENTS,
  REMINDER_ENTRY_POINTS,
  REMINDER_NOTIFICATION_CONTENT,
  REMINDER_PERMISSION_STATES,
  REMINDER_STATES,
  REMINDER_TARGET_KINDS,
  SETTINGS_EVENTS,
} from '@/constants';
import {
  CustomBeliefSystemId,
  type BeliefStatement,
} from '@/features/beliefs/domain/belief-statement';
import {
  CheckInId,
  CheckInTimestamp,
  type CheckIn,
  type EmotionSelection,
} from '@/features/check-in/domain/check-in';
import { emotions } from '@/features/check-in/domain/emotion';
import { checkInHistoryStore } from '@/app-stores';
import { appSettingsStore } from '@/app-stores';
import {
  DataArchiveSchema,
  DataArchiveTimestamp,
} from '@/features/data-safety/domain/data-archive';
import * as dataArchiveRepository from '@/features/data-safety/infrastructure/data-archive.repository';
import { DataArchiveStorageError } from '@/features/data-safety/infrastructure/data-archive.repository';
import {
  failNextSurrealDelete,
  failNextSurrealUpsert,
  mockSurrealDatabase,
  mockSurrealQuery,
  resetSurrealDatabaseMock,
} from '@/test-utils/surrealdb.repository.mock';
import { appNavigationMachine, routeForStateValue } from '../app-navigation.machine';
import * as reminderScheduler from '@/features/reminders/infrastructure/local-reminder.scheduler';
import {
  ReminderAssignmentId,
  ReminderAssignmentSchema,
  ReminderTimestamp,
} from '@/features/reminders/domain/reminder-assignment';

jest.mock('@/infrastructure/database/surrealdb.database', () => ({
  getDatabase: jest.fn(() => Promise.resolve(mockSurrealDatabase)),
  queryDatabase: jest.fn(({ surql, variables }: {
    surql: string;
    variables?: Parameters<typeof mockSurrealDatabase.query>[1];
  }) => variables === undefined
    ? mockSurrealDatabase.query(surql)
    : mockSurrealDatabase.query(surql, variables)),
}));

jest.mock('@/features/reminders/infrastructure/local-reminder.scheduler', () => ({
  getReminderPermission: jest.fn(() => Promise.resolve('granted')),
  requestReminderPermission: jest.fn(() => Promise.resolve('granted')),
  reconcileReminderNotifications: jest.fn(() => Promise.resolve()),
  sendTestReminder: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('@/features/data-safety/infrastructure/data-archive.repository', () => {
  const actual = jest.requireActual<typeof import('@/features/data-safety/infrastructure/data-archive.repository')>(
    '@/features/data-safety/infrastructure/data-archive.repository',
  );
  return {
    ...actual,
    exportDataArchive: jest.fn(),
    pickDataArchive: jest.fn(),
    restoreDataArchive: jest.fn(),
    deleteAllJournalData: jest.fn(),
  };
});

const mockExportDataArchive = jest.mocked(dataArchiveRepository.exportDataArchive);
const mockPickDataArchive = jest.mocked(dataArchiveRepository.pickDataArchive);
const mockRestoreDataArchive = jest.mocked(dataArchiveRepository.restoreDataArchive);
const mockDeleteAllJournalData = jest.mocked(dataArchiveRepository.deleteAllJournalData);
const mockRequestReminderPermission = jest.mocked(reminderScheduler.requestReminderPermission);
const mockGetReminderPermission = jest.mocked(reminderScheduler.getReminderPermission);

const joyEmotion = emotions.find(({ id }) => id === EMOTION_IDS.JOY);
if (!joyEmotion) throw new Error('The joy emotion fixture must exist.');

const selection = {
  emotionId: EMOTION_IDS.JOY,
  intensity: 0.42,
  level: 2,
  color: joyEmotion.color,
} satisfies EmotionSelection;

const hydrationSentinel = {
  id: CheckInId.make('hydration-sentinel'),
  createdAt: CheckInTimestamp.make('2026-07-18T00:00:00.000Z'),
  occurredAt: CheckInTimestamp.make('2026-07-18T00:00:00.000Z'),
  emotionId: EMOTION_IDS.JOY,
  intensity: 0.5,
  note: '',
} satisfies CheckIn;

const dataArchive = DataArchiveSchema.make({
  version: 2,
  exportedAt: DataArchiveTimestamp.make('2026-08-02T08:00:00.000Z'),
  checkIns: [{
    ...hydrationSentinel,
    id: CheckInId.make('restored-moment'),
  }],
  beliefStatements: [{
    kind: 'built-in',
    beliefSystemId: BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING,
    guidingStatement: 'I may pause.',
  }],
  settings: {
    locale: APP_LOCALES.GERMAN,
    emotionLabelMode: EMOTION_LABEL_MODES.TEXT,
    onboardingCompleted: true,
  },
});

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

async function finishWithGuidingBelief({
  actor,
  assignments = [],
}: {
  actor: Actor<typeof appNavigationMachine>;
  assignments?: readonly typeof ReminderAssignmentSchema.Type[];
}) {
  await waitFor(
    actor,
    (candidate) => candidate.context.reminderDataHydrated
      && candidate.context.beliefStatementsHydrated,
    { timeout: 1_000 },
  );
  actor.send({
    type: CHECK_IN_EVENTS.BELIEF_STATEMENTS_HYDRATED,
    statements: [{
      kind: 'built-in',
      beliefSystemId: BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING,
      guidingStatement: 'I may pause and still be enough.',
    }],
  });
  actor.send({ type: REMINDER_EVENTS.HYDRATED, assignments });
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
  actor.send({ type: CHECK_IN_EVENTS.CONFIRMED });
  await waitFor(
    actor,
    (candidate) => candidate.matches(CHECK_IN_STATES.GUIDING_BELIEF),
    { timeout: 1_000 },
  );
  actor.send({ type: CHECK_IN_EVENTS.GUIDING_BELIEF_SKIPPED });
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
        onboardingCompleted: true,
      },
    });
    mockExportDataArchive.mockReset();
    mockPickDataArchive.mockReset();
    mockRestoreDataArchive.mockReset();
    mockDeleteAllJournalData.mockReset();
    mockExportDataArchive.mockReturnValue(Effect.succeed(undefined));
    mockPickDataArchive.mockReturnValue(Effect.succeed(null));
    mockRestoreDataArchive.mockReturnValue(Effect.succeed(undefined));
    mockDeleteAllJournalData.mockReturnValue(Effect.succeed(undefined));
    mockRequestReminderPermission.mockClear();
    mockRequestReminderPermission.mockResolvedValue(REMINDER_PERMISSION_STATES.GRANTED);
    mockGetReminderPermission.mockClear();
    mockGetReminderPermission.mockResolvedValue(REMINDER_PERMISSION_STATES.UNDETERMINED);
  });

  it('exports a local backup from an explicit Settings model path', async () => {
    const actor = createActor(appNavigationMachine).start();
    actor.send({ type: NAVIGATION_EVENTS.SETTINGS_OPENED });
    actor.send({ type: DATA_SAFETY_EVENTS.EXPORT_REQUESTED });

    expect(actor.getSnapshot().matches({
      [NAVIGATION_STATES.TABS]: {
        [NAVIGATION_STATES.SETTINGS]: DATA_SAFETY_STATES.EXPORTING,
      },
    })).toBe(true);
    await waitFor(actor, (snapshot) => snapshot.context.dataSafetyNotice !== null);

    expect(mockExportDataArchive).toHaveBeenCalledTimes(1);
    expect(routeForStateValue(actor.getSnapshot().value)).toBe(APP_ROUTES.SETTINGS);
  });

  it('previews a decoded archive before atomically replacing current data', async () => {
    mockPickDataArchive.mockReturnValue(Effect.succeed(dataArchive));
    const actor = createActor(appNavigationMachine).start();
    actor.send({ type: NAVIGATION_EVENTS.SETTINGS_OPENED });
    actor.send({ type: DATA_SAFETY_EVENTS.RESTORE_REQUESTED });
    await waitFor(actor, (snapshot) => snapshot.matches({
      [NAVIGATION_STATES.TABS]: {
        [NAVIGATION_STATES.SETTINGS]: DATA_SAFETY_STATES.RESTORE_PREVIEW,
      },
    }));

    expect(checkInHistoryStore.getSnapshot().context.entries).not.toEqual(dataArchive.checkIns);
    actor.send({ type: DATA_SAFETY_EVENTS.RESTORE_CONFIRMED });
    await waitFor(actor, (snapshot) => snapshot.context.dataSafetyNotice !== null);

    expect(mockRestoreDataArchive).toHaveBeenCalledWith(dataArchive);
    expect(checkInHistoryStore.getSnapshot().context.entries).toEqual(dataArchive.checkIns);
    expect(appSettingsStore.getSnapshot().context.locale).toBe(APP_LOCALES.GERMAN);
    expect(actor.getSnapshot().context.beliefStatements).toEqual(dataArchive.beliefStatements);
  });

  it('preserves current in-memory data when restore fails', async () => {
    checkInHistoryStore.trigger.hydrated({ entries: [hydrationSentinel] });
    mockPickDataArchive.mockReturnValue(Effect.succeed(dataArchive));
    mockRestoreDataArchive.mockReturnValue(Effect.fail(DataArchiveStorageError.make({
      operation: 'restore',
      cause: new Error('restore failed'),
    })));
    const actor = createActor(appNavigationMachine).start();
    actor.send({ type: NAVIGATION_EVENTS.SETTINGS_OPENED });
    actor.send({ type: DATA_SAFETY_EVENTS.RESTORE_REQUESTED });
    await waitFor(actor, (snapshot) => snapshot.context.dataArchive !== null);
    actor.send({ type: DATA_SAFETY_EVENTS.RESTORE_CONFIRMED });
    await waitFor(actor, (snapshot) => snapshot.context.dataSafetyError !== null);

    expect(checkInHistoryStore.getSnapshot().context.entries).toEqual([hydrationSentinel]);
    expect(actor.getSnapshot().context.dataArchive).toBeNull();
  });

  it('requires confirmation before deleting journal data and keeps preferences', async () => {
    checkInHistoryStore.trigger.hydrated({ entries: [hydrationSentinel] });
    const actor = createActor(appNavigationMachine).start();
    actor.send({ type: NAVIGATION_EVENTS.SETTINGS_OPENED });
    actor.send({ type: DATA_SAFETY_EVENTS.DELETE_REQUESTED });

    expect(mockDeleteAllJournalData).not.toHaveBeenCalled();
    expect(actor.getSnapshot().matches({
      [NAVIGATION_STATES.TABS]: {
        [NAVIGATION_STATES.SETTINGS]: DATA_SAFETY_STATES.DELETE_CONFIRMATION,
      },
    })).toBe(true);
    actor.send({ type: DATA_SAFETY_EVENTS.DELETE_CONFIRMED });
    await waitFor(actor, (snapshot) => snapshot.context.dataSafetyNotice !== null);

    expect(checkInHistoryStore.getSnapshot().context.entries).toEqual([]);
    expect(appSettingsStore.getSnapshot().context.locale).toBe(APP_LOCALES.ENGLISH);
  });

  it('makes tab navigation an explicit state graph', () => {
    const actor = createActor(appNavigationMachine).start();
    expect(routeForStateValue(actor.getSnapshot().value)).toBe(APP_ROUTES.TODAY);

    actor.send({ type: NAVIGATION_EVENTS.HISTORY_OPENED });
    expect(actor.getSnapshot().matches({ [NAVIGATION_STATES.TABS]: NAVIGATION_STATES.HISTORY })).toBe(true);
    expect(routeForStateValue(actor.getSnapshot().value)).toBe(APP_ROUTES.HISTORY);

    actor.send({ type: NAVIGATION_EVENTS.ANALYTICS_OPENED });
    expect(actor.getSnapshot().matches({
      [NAVIGATION_STATES.TABS]: NAVIGATION_STATES.ANALYTICS,
    })).toBe(true);
    expect(routeForStateValue(actor.getSnapshot().value)).toBe(APP_ROUTES.ANALYTICS);

    actor.send({ type: NAVIGATION_EVENTS.SETTINGS_OPENED });
    expect(routeForStateValue(actor.getSnapshot().value)).toBe(APP_ROUTES.SETTINGS);

    actor.send({ type: NAVIGATION_EVENTS.TODAY_OPENED });
    expect(routeForStateValue(actor.getSnapshot().value)).toBe(APP_ROUTES.TODAY);
  });

  it('guides an incomplete first launch through every onboarding model state', () => {
    appSettingsStore.trigger.onboardingCompletedChanged({ completed: false });
    mockSurrealQuery.mockImplementation(async (surql) => [{
      statementIndex: 0,
      value: surql.startsWith('SELECT locale, emotionLabelMode, onboardingCompleted')
        ? [{
            locale: APP_LOCALES.ENGLISH,
            emotionLabelMode: EMOTION_LABEL_MODES.EMOJI,
            onboardingCompleted: false,
          }]
        : [],
    }]);
    const actor = createActor(appNavigationMachine).start();

    expect(actor.getSnapshot().matches({
      [NAVIGATION_STATES.ONBOARDING]: ONBOARDING_STATES.WELCOME,
    })).toBe(true);
    expect(actor.getSnapshot().context.onboardingEntryPoint).toBe(
      ONBOARDING_ENTRY_POINTS.FIRST_LAUNCH,
    );
    expect(routeForStateValue(actor.getSnapshot().value)).toBe(APP_ROUTES.ONBOARDING);

    actor.send({ type: ONBOARDING_EVENTS.NEXT_REQUESTED });
    expect(actor.getSnapshot().matches({
      [NAVIGATION_STATES.ONBOARDING]: ONBOARDING_STATES.PULSE,
    })).toBe(true);
    actor.send({
      type: ONBOARDING_EVENTS.SELECTION_CHANGED,
      selection,
    });
    expect(actor.getSnapshot().context.onboardingSelection?.emotionId).toBe(
      EMOTION_IDS.JOY,
    );
    actor.send({ type: ONBOARDING_EVENTS.NEXT_REQUESTED });
    expect(actor.getSnapshot().matches({
      [NAVIGATION_STATES.ONBOARDING]: ONBOARDING_STATES.EXAMPLE,
    })).toBe(true);
    expect(actor.getSnapshot().context.onboardingSelection).toMatchObject({
      emotionId: EMOTION_IDS.FEAR,
      level: 3,
    });

    actor.send({ type: ONBOARDING_EVENTS.FINISHED });

    expect(routeForStateValue(actor.getSnapshot().value)).toBe(APP_ROUTES.TODAY);
    expect(actor.getSnapshot().context.onboardingSelection).toBeNull();
    expect(actor.getSnapshot().context.onboardingEntryPoint).toBeNull();
    expect(appSettingsStore.getSnapshot().context.onboardingCompleted).toBe(true);
  });

  it('skips first-launch onboarding without blocking navigation on persistence', async () => {
    appSettingsStore.trigger.onboardingCompletedChanged({ completed: false });
    const actor = createActor(appNavigationMachine).start();
    failNextSurrealUpsert(new Error('onboarding preference unavailable'));

    actor.send({ type: ONBOARDING_EVENTS.SKIPPED });

    expect(routeForStateValue(actor.getSnapshot().value)).toBe(APP_ROUTES.TODAY);
    await waitFor(
      actor,
      () => appSettingsStore.getSnapshot().context.error !== null,
      { timeout: 1_000 },
    );
    expect(appSettingsStore.getSnapshot().context.onboardingCompleted).toBe(true);
  });

  it('replays onboarding from Settings and returns there without changing completion', () => {
    const actor = createActor(appNavigationMachine).start();
    actor.send({ type: NAVIGATION_EVENTS.SETTINGS_OPENED });
    actor.send({ type: ONBOARDING_EVENTS.OPENED });

    expect(routeForStateValue(actor.getSnapshot().value)).toBe(APP_ROUTES.ONBOARDING);
    expect(actor.getSnapshot().context.onboardingEntryPoint).toBe(
      ONBOARDING_ENTRY_POINTS.SETTINGS,
    );
    actor.send({ type: ONBOARDING_EVENTS.NEXT_REQUESTED });
    actor.send({ type: ONBOARDING_EVENTS.EXAMPLE_REQUESTED });
    actor.send({ type: ONBOARDING_EVENTS.NEXT_REQUESTED });
    actor.send({ type: ONBOARDING_EVENTS.FINISHED });

    expect(routeForStateValue(actor.getSnapshot().value)).toBe(APP_ROUTES.SETTINGS);
    expect(appSettingsStore.getSnapshot().context.onboardingCompleted).toBe(true);
  });

  it('allows Settings replays to be skipped from every onboarding step', () => {
    const steps = [
      ONBOARDING_STATES.WELCOME,
      ONBOARDING_STATES.PULSE,
      ONBOARDING_STATES.EXAMPLE,
    ];

    steps.forEach((step) => {
      const actor = createActor(appNavigationMachine).start();
      actor.send({ type: NAVIGATION_EVENTS.SETTINGS_OPENED });
      actor.send({ type: ONBOARDING_EVENTS.OPENED });
      if (step !== ONBOARDING_STATES.WELCOME) {
        actor.send({ type: ONBOARDING_EVENTS.NEXT_REQUESTED });
      }
      if (step === ONBOARDING_STATES.EXAMPLE) {
        actor.send({ type: ONBOARDING_EVENTS.EXAMPLE_REQUESTED });
        actor.send({ type: ONBOARDING_EVENTS.NEXT_REQUESTED });
      }

      expect(actor.getSnapshot().matches({
        [NAVIGATION_STATES.ONBOARDING]: step,
      })).toBe(true);
      actor.send({ type: ONBOARDING_EVENTS.SKIPPED });
      expect(routeForStateValue(actor.getSnapshot().value)).toBe(APP_ROUTES.SETTINGS);
      actor.stop();
    });
  });

  it('clears a cancelled Pulse practice and supports back navigation', () => {
    const actor = createActor(appNavigationMachine).start();
    actor.send({ type: NAVIGATION_EVENTS.SETTINGS_OPENED });
    actor.send({ type: ONBOARDING_EVENTS.OPENED });
    actor.send({ type: ONBOARDING_EVENTS.NEXT_REQUESTED });
    actor.send({ type: ONBOARDING_EVENTS.EXAMPLE_REQUESTED });
    actor.send({ type: ONBOARDING_EVENTS.SELECTION_CANCELLED });

    expect(actor.getSnapshot().context.onboardingSelection).toBeNull();
    actor.send({ type: ONBOARDING_EVENTS.BACK_REQUESTED });
    expect(actor.getSnapshot().matches({
      [NAVIGATION_STATES.ONBOARDING]: ONBOARDING_STATES.WELCOME,
    })).toBe(true);
  });

  it('edits and removes personal beliefs through explicit library states', async () => {
    const actor = createActor(appNavigationMachine).start();
    const beliefSystemId = CustomBeliefSystemId.make('custom-manage-me');
    actor.send({
      type: CHECK_IN_EVENTS.BELIEF_STATEMENTS_HYDRATED,
      statements: [{
        kind: 'custom',
        beliefSystemId,
        harmfulStatement: 'I must never need help.',
        guidingStatement: 'I can ask for support.',
      }] satisfies readonly BeliefStatement[],
    });
    actor.send({ type: NAVIGATION_EVENTS.SETTINGS_OPENED });
    actor.send({ type: BELIEF_LIBRARY_EVENTS.OPENED });

    expect(actor.getSnapshot().matches(BELIEF_LIBRARY_STATES.LIBRARY)).toBe(true);
    expect(routeForStateValue(actor.getSnapshot().value)).toBe(APP_ROUTES.BELIEF_LIBRARY);

    actor.send({ type: BELIEF_LIBRARY_EVENTS.CREATE_REQUESTED });
    const createdBeliefSystemId = actor.getSnapshot().context.beliefLibraryStatementId;
    expect(createdBeliefSystemId).not.toBeNull();
    expect(actor.getSnapshot().matches(BELIEF_LIBRARY_STATES.EDITOR)).toBe(true);
    expect(actor.getSnapshot().context.guidingHelpVisible).toBe(false);
    actor.send({ type: BELIEF_LIBRARY_EVENTS.GUIDING_HELP_TOGGLED });
    expect(actor.getSnapshot().context.guidingHelpVisible).toBe(true);
    actor.send({
      type: BELIEF_LIBRARY_EVENTS.HARMFUL_DRAFT_CHANGED,
      statement: 'I must always stay strong.',
    });
    actor.send({ type: BELIEF_LIBRARY_EVENTS.SAVE_REQUESTED });
    await waitFor(
      actor,
      (candidate) => candidate.matches(BELIEF_LIBRARY_STATES.LIBRARY),
      { timeout: 1_000 },
    );
    expect(actor.getSnapshot().context.beliefStatements).toContainEqual({
      kind: 'custom',
      beliefSystemId: createdBeliefSystemId,
      harmfulStatement: 'I must always stay strong.',
    });

    actor.send({ type: BELIEF_LIBRARY_EVENTS.EDIT_REQUESTED, beliefSystemId });
    expect(actor.getSnapshot().matches(BELIEF_LIBRARY_STATES.EDITOR)).toBe(true);
    actor.send({
      type: BELIEF_LIBRARY_EVENTS.HARMFUL_DRAFT_CHANGED,
      statement: 'I may need help sometimes.',
    });
    actor.send({
      type: BELIEF_LIBRARY_EVENTS.GUIDING_DRAFT_CHANGED,
      statement: 'Support makes connection possible.',
    });
    actor.send({ type: BELIEF_LIBRARY_EVENTS.SAVE_REQUESTED });
    await waitFor(
      actor,
      (candidate) => candidate.matches(BELIEF_LIBRARY_STATES.LIBRARY),
      { timeout: 1_000 },
    );

    expect(actor.getSnapshot().context.beliefStatements).toContainEqual({
      kind: 'custom',
      beliefSystemId,
      harmfulStatement: 'I may need help sometimes.',
      guidingStatement: 'Support makes connection possible.',
    });

    actor.send({ type: BELIEF_LIBRARY_EVENTS.REMOVE_REQUESTED, beliefSystemId });
    await waitFor(
      actor,
      (candidate) => candidate.matches(BELIEF_LIBRARY_STATES.LIBRARY),
      { timeout: 1_000 },
    );

    expect(actor.getSnapshot().context.beliefStatements).not.toContainEqual(
      expect.objectContaining({ beliefSystemId }),
    );
    actor.send({ type: BELIEF_LIBRARY_EVENTS.CLOSED });
    expect(routeForStateValue(actor.getSnapshot().value)).toBe(APP_ROUTES.SETTINGS);
  });

  it('offers a reminder only after a new positive Leitsatz is durably saved', async () => {
    const actor = createActor(appNavigationMachine).start();
    actor.send({ type: NAVIGATION_EVENTS.SETTINGS_OPENED });
    actor.send({ type: BELIEF_LIBRARY_EVENTS.OPENED });
    actor.send({ type: BELIEF_LIBRARY_EVENTS.CREATE_REQUESTED });
    actor.send({
      type: BELIEF_LIBRARY_EVENTS.HARMFUL_DRAFT_CHANGED,
      statement: 'I must always stay strong.',
    });
    actor.send({
      type: BELIEF_LIBRARY_EVENTS.GUIDING_DRAFT_CHANGED,
      statement: 'I may receive support.',
    });
    actor.send({ type: BELIEF_LIBRARY_EVENTS.SAVE_REQUESTED });

    const offer = await waitFor(
      actor,
      (candidate) => candidate.matches(REMINDER_STATES.OFFER),
      { timeout: 1_000 },
    );
    expect(offer.context.beliefStatements).toContainEqual(expect.objectContaining({
      guidingStatement: 'I may receive support.',
    }));
    expect(routeForStateValue(offer.value)).toBe(APP_ROUTES.LEITSATZ_REMINDER);

    actor.send({ type: REMINDER_EVENTS.OFFER_ACCEPTED });
    await waitFor(
      actor,
      (candidate) => candidate.matches(REMINDER_STATES.EDITOR),
      { timeout: 3_000 },
    );
    actor.send({ type: NAVIGATION_EVENTS.BACK_REQUESTED });
    expect(actor.getSnapshot().matches(BELIEF_LIBRARY_STATES.LIBRARY)).toBe(true);
    expect(actor.getSnapshot().matches(REMINDER_STATES.OFFER)).toBe(false);
  });

  it('requests permission before exposing schedules and creates no assignment on denial', async () => {
    mockRequestReminderPermission.mockResolvedValueOnce(REMINDER_PERMISSION_STATES.DENIED);
    const actor = createActor(appNavigationMachine).start();
    const beliefSystemId = CustomBeliefSystemId.make('custom-permission-order');
    actor.send({
      type: CHECK_IN_EVENTS.BELIEF_STATEMENTS_HYDRATED,
      statements: [{
        kind: 'custom',
        beliefSystemId,
        harmfulStatement: 'I must never need help.',
        guidingStatement: 'I may receive support.',
      }],
    });
    actor.send({ type: NAVIGATION_EVENTS.SETTINGS_OPENED });
    actor.send({ type: BELIEF_LIBRARY_EVENTS.OPENED });
    actor.send({ type: BELIEF_LIBRARY_EVENTS.EDIT_REQUESTED, beliefSystemId });
    actor.send({
      type: BELIEF_LIBRARY_EVENTS.GUIDING_DRAFT_CHANGED,
      statement: 'I may receive support today.',
    });
    actor.send({ type: BELIEF_LIBRARY_EVENTS.SAVE_REQUESTED });
    await waitFor(actor, (candidate) => candidate.matches(BELIEF_LIBRARY_STATES.LIBRARY));

    actor.send({ type: BELIEF_LIBRARY_EVENTS.CREATE_REQUESTED });
    actor.send({
      type: BELIEF_LIBRARY_EVENTS.HARMFUL_DRAFT_CHANGED,
      statement: 'I must solve this alone.',
    });
    actor.send({
      type: BELIEF_LIBRARY_EVENTS.GUIDING_DRAFT_CHANGED,
      statement: 'I can ask for help.',
    });
    actor.send({ type: BELIEF_LIBRARY_EVENTS.SAVE_REQUESTED });
    await waitFor(actor, (candidate) => candidate.matches(REMINDER_STATES.OFFER));

    actor.send({ type: REMINDER_EVENTS.OFFER_ACCEPTED });
    const denied = await waitFor(
      actor,
      (candidate) => candidate.matches(REMINDER_STATES.PERMISSION_DENIED),
      { timeout: 1_000 },
    );
    expect(mockRequestReminderPermission).toHaveBeenCalledTimes(1);
    expect(denied.context.reminderAssignments).toEqual([]);
    expect(denied.can({ type: REMINDER_EVENTS.SAVE_REQUESTED })).toBe(false);
  });

  it('skips the offer after a grant and rechecks permission after a later denial', async () => {
    const actor = createActor(appNavigationMachine).start();
    const beliefSystemId = CustomBeliefSystemId.make('custom-reminder-target');
    actor.send({
      type: CHECK_IN_EVENTS.BELIEF_STATEMENTS_HYDRATED,
      statements: [{
        kind: 'custom',
        beliefSystemId,
        harmfulStatement: 'I must keep going.',
        guidingStatement: 'I can pause.',
      }],
    });
    actor.send({ type: NAVIGATION_EVENTS.SETTINGS_OPENED });
    actor.send({ type: REMINDER_EVENTS.OPENED });
    await waitFor(actor, (candidate) => candidate.matches(REMINDER_STATES.SETTINGS));
    actor.send({ type: NAVIGATION_EVENTS.BACK_REQUESTED });
    actor.send({ type: BELIEF_LIBRARY_EVENTS.OPENED });
    await waitFor(actor, (candidate) => candidate.matches(BELIEF_LIBRARY_STATES.LIBRARY));

    mockGetReminderPermission.mockResolvedValue(REMINDER_PERMISSION_STATES.GRANTED);
    actor.send({ type: REMINDER_EVENTS.TARGET_SELECTED, beliefSystemId });

    await waitFor(
      actor,
      (candidate) => candidate.matches(REMINDER_STATES.EDITOR),
      { timeout: 3_000 },
    );
    expect(mockRequestReminderPermission).not.toHaveBeenCalled();
    actor.send({ type: NAVIGATION_EVENTS.BACK_REQUESTED });
    expect(actor.getSnapshot().matches(BELIEF_LIBRARY_STATES.LIBRARY)).toBe(true);
    expect(actor.getSnapshot().matches(REMINDER_STATES.OFFER)).toBe(false);

    mockGetReminderPermission.mockResolvedValue(REMINDER_PERMISSION_STATES.DENIED);
    actor.send({ type: REMINDER_EVENTS.TARGET_SELECTED, beliefSystemId });
    await waitFor(
      actor,
      (candidate) => candidate.matches(REMINDER_STATES.PERMISSION_DENIED),
      { timeout: 3_000 },
    );
    mockGetReminderPermission.mockResolvedValue(REMINDER_PERMISSION_STATES.GRANTED);
    actor.send({ type: REMINDER_EVENTS.SETTINGS_RETURNED });
    await waitFor(
      actor,
      (candidate) => candidate.matches(REMINDER_STATES.EDITOR),
      { timeout: 3_000 },
    );

    expect(actor.getSnapshot().matches(REMINDER_STATES.OFFER)).toBe(false);
    expect(mockRequestReminderPermission).not.toHaveBeenCalled();
  });

  it('starts a reminder for a suggested belief selected from the library', async () => {
    const actor = createActor(appNavigationMachine).start();
    actor.send({
      type: CHECK_IN_EVENTS.BELIEF_STATEMENTS_HYDRATED,
      statements: [{
        kind: 'built-in',
        beliefSystemId: BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING,
        guidingStatement: 'I may pause and still be enough.',
      }],
    });
    actor.send({ type: NAVIGATION_EVENTS.SETTINGS_OPENED });
    actor.send({ type: BELIEF_LIBRARY_EVENTS.OPENED });
    await waitFor(actor, (candidate) => candidate.matches(BELIEF_LIBRARY_STATES.LIBRARY));

    mockGetReminderPermission.mockResolvedValue(REMINDER_PERMISSION_STATES.GRANTED);
    actor.send({
      type: REMINDER_EVENTS.TARGET_SELECTED,
      beliefSystemId: BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING,
    });

    const editor = await waitFor(
      actor,
      (candidate) => candidate.matches(REMINDER_STATES.EDITOR),
      { timeout: 3_000 },
    );
    expect(editor.context).toMatchObject({
      reminderTargetKind: REMINDER_TARGET_KINDS.GUIDING_BELIEF,
      reminderTargetBeliefSystemId: BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING,
      reminderEntryPoint: REMINDER_ENTRY_POINTS.BELIEF_LIBRARY,
    });

    actor.send({ type: NAVIGATION_EVENTS.BACK_REQUESTED });
    expect(actor.getSnapshot().matches(BELIEF_LIBRARY_STATES.LIBRARY)).toBe(true);
  });

  it('returns every optional success-screen permission exit to the completed check-in', async () => {
    const actor = createActor(appNavigationMachine).start();
    await finishWithGuidingBelief({ actor });

    actor.send({ type: REMINDER_EVENTS.SUCCESS_OFFER_ACCEPTED });
    const offer = await waitFor(
      actor,
      (candidate) => candidate.matches(REMINDER_STATES.OFFER),
      { timeout: 1_000 },
    );
    expect(offer.context).toMatchObject({
      reminderEntryPoint: REMINDER_ENTRY_POINTS.CHECK_IN_SUCCESS,
      reminderTargetBeliefSystemId: BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING,
    });

    actor.send({ type: NAVIGATION_EVENTS.BACK_REQUESTED });
    expect(actor.getSnapshot().matches(CHECK_IN_STATES.SUCCESS)).toBe(true);

    actor.send({ type: REMINDER_EVENTS.SUCCESS_OFFER_ACCEPTED });
    await waitFor(actor, (candidate) => candidate.matches(REMINDER_STATES.OFFER));
    mockRequestReminderPermission.mockResolvedValueOnce(REMINDER_PERMISSION_STATES.DENIED);
    actor.send({ type: REMINDER_EVENTS.OFFER_ACCEPTED });
    await waitFor(actor, (candidate) => candidate.matches(REMINDER_STATES.PERMISSION_DENIED));
    actor.send({ type: REMINDER_EVENTS.OFFER_DECLINED });

    expect(actor.getSnapshot().matches(CHECK_IN_STATES.SUCCESS)).toBe(true);
    expect(actor.getSnapshot().context.saved?.beliefSystemId).toBe(
      BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING,
    );
  });

  it('returns to success after activating assignment-owned timing for its Leitsatz', async () => {
    mockGetReminderPermission.mockResolvedValue(REMINDER_PERMISSION_STATES.GRANTED);
    const actor = createActor(appNavigationMachine).start();
    await finishWithGuidingBelief({ actor });

    actor.send({ type: REMINDER_EVENTS.SUCCESS_OFFER_ACCEPTED });
    await waitFor(actor, (candidate) => candidate.matches(REMINDER_STATES.EDITOR));
    actor.send({ type: REMINDER_EVENTS.SAVE_REQUESTED });
    const active = await waitFor(
      actor,
      (candidate) => candidate.matches(REMINDER_STATES.ACTIVE),
      { timeout: 1_000 },
    );
    expect(active.context.reminderAssignments).toContainEqual(expect.objectContaining({
      targetKind: REMINDER_TARGET_KINDS.GUIDING_BELIEF,
      beliefSystemId: BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING,
    }));

    actor.send({ type: REMINDER_EVENTS.DONE });
    expect(actor.getSnapshot().matches(CHECK_IN_STATES.SUCCESS)).toBe(true);
    actor.send({ type: REMINDER_EVENTS.SUCCESS_OFFER_ACCEPTED });
    expect(actor.getSnapshot().matches(CHECK_IN_STATES.SUCCESS)).toBe(true);
  });

  it('does not enter reminder setup when reminder data failed to load', async () => {
    const actor = createActor(appNavigationMachine).start();
    await finishWithGuidingBelief({ actor });
    actor.send({
      type: REMINDER_EVENTS.HYDRATION_FAILED,
      message: 'Your reminders could not be loaded.',
    });

    actor.send({ type: REMINDER_EVENTS.SUCCESS_OFFER_ACCEPTED });

    expect(actor.getSnapshot().matches(CHECK_IN_STATES.SUCCESS)).toBe(true);
  });

  it('keeps a cold notification tap on its focused Leitsatz while beliefs hydrate', () => {
    const actor = createActor(appNavigationMachine).start();
    const assignmentId = ReminderAssignmentId.make('notification-assignment');
    const beliefSystemId = CustomBeliefSystemId.make('custom-notification-belief');

    actor.send({
      type: REMINDER_EVENTS.NOTIFICATION_OPENED,
      assignmentId,
      targetKind: REMINDER_TARGET_KINDS.GUIDING_BELIEF,
      beliefSystemId,
    });

    expect(actor.getSnapshot().matches(REMINDER_STATES.GUIDING_BELIEF)).toBe(true);
    expect(actor.getSnapshot().context).toMatchObject({
      reminderAssignmentDraftId: assignmentId,
      reminderTargetBeliefSystemId: beliefSystemId,
    });

    actor.send({
      type: CHECK_IN_EVENTS.BELIEF_STATEMENTS_HYDRATED,
      statements: [{
        kind: 'custom',
        beliefSystemId,
        harmfulStatement: 'I must do this alone.',
        guidingStatement: 'I may receive support.',
      }],
    });

    expect(actor.getSnapshot().matches(REMINDER_STATES.GUIDING_BELIEF)).toBe(true);
    actor.send({ type: NAVIGATION_EVENTS.BACK_REQUESTED });
    expect(routeForStateValue(actor.getSnapshot().value)).toBe(APP_ROUTES.TODAY);
  });

  it('edits the tapped reminder directly without requesting permission again', () => {
    const actor = createActor(appNavigationMachine).start();
    const assignmentId = ReminderAssignmentId.make('editable-notification-assignment');
    const beliefSystemId = CustomBeliefSystemId.make('custom-editable-notification-belief');
    const timestamp = ReminderTimestamp.make('2026-08-13T18:00:00.000Z');
    actor.send({
      type: REMINDER_EVENTS.HYDRATED,
      assignments: [{
        id: assignmentId,
        schemaVersion: 2,
        targetKind: REMINDER_TARGET_KINDS.GUIDING_BELIEF,
        beliefSystemId,
        enabled: true,
        weekdays: [2, 4],
        times: [{ hour: 20, minute: 0 }],
        notificationContent: REMINDER_NOTIFICATION_CONTENT.LEITSATZ,
        createdAt: timestamp,
        updatedAt: timestamp,
      }],
    });
    actor.send({
      type: REMINDER_EVENTS.NOTIFICATION_OPENED,
      assignmentId,
      targetKind: REMINDER_TARGET_KINDS.GUIDING_BELIEF,
      beliefSystemId,
    });
    actor.send({ type: REMINDER_EVENTS.EDIT_REQUESTED });

    expect(actor.getSnapshot().matches(REMINDER_STATES.EDITOR)).toBe(true);
    expect(actor.getSnapshot().context).toMatchObject({
      reminderNotificationContentDraft: REMINDER_NOTIFICATION_CONTENT.LEITSATZ,
      reminderWeekdaysDraft: [2, 4],
      reminderTimesDraft: [{ hour: 20, minute: 0 }],
    });
    expect(mockRequestReminderPermission).not.toHaveBeenCalled();
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
            onboardingCompleted: true,
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
      onboardingCompleted: true,
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

    actor.send({
      type: CHECK_IN_EVENTS.NOTE_CHANGED,
      note: 'a'.repeat(MAX_NOTE_LENGTH + 1),
    });
    expect(actor.getSnapshot().context.note).toHaveLength(MAX_NOTE_LENGTH);
    actor.send({ type: CHECK_IN_EVENTS.CONFIRMED });
    expect(actor.getSnapshot().matches(CHECK_IN_STATES.SAVING)).toBe(true);
  });

  it('persists the same selected moment when the user saves reflection for now', async () => {
    const actor = createActor(appNavigationMachine).start();
    actor.send({ type: CHECK_IN_EVENTS.TOUCH_STARTED });
    actor.send({ type: CHECK_IN_EVENTS.SELECTION_CHANGED, selection });
    actor.send({ type: CHECK_IN_EVENTS.SELECTION_RELEASED });
    actor.send({ type: CHECK_IN_EVENTS.NOTE_CHANGED, note: 'Enough for today.' });
    actor.send({ type: CHECK_IN_EVENTS.SAVE_FOR_NOW_REQUESTED });

    const completed = await waitFor(
      actor,
      (candidate) => candidate.matches(CHECK_IN_STATES.SUCCESS),
      { timeout: 1_000 },
    );

    expect(completed.context.saved).toMatchObject({
      emotionId: selection.emotionId,
      intensity: selection.intensity,
      note: 'Enough for today.',
    });
    expect(routeForStateValue(completed.value)).toBe(APP_ROUTES.SUCCESS);
  });

  it('keeps occurrence-time edits provisional until the user confirms them', () => {
    const actor = createActor(appNavigationMachine).start();
    actor.send({ type: CHECK_IN_EVENTS.TOUCH_STARTED });
    actor.send({ type: CHECK_IN_EVENTS.SELECTION_CHANGED, selection });
    actor.send({ type: CHECK_IN_EVENTS.SELECTION_RELEASED });

    const original = actor.getSnapshot().context.occurredAtDraft;
    expect(original).not.toBeNull();
    expect(actor.getSnapshot().context.occurredAtCustomized).toBe(false);

    const past = CheckInTimestamp.make('2020-04-12T08:30:00.000Z');
    actor.send({ type: CHECK_IN_EVENTS.MOMENT_TIME_EDITOR_OPENED });
    actor.send({ type: CHECK_IN_EVENTS.MOMENT_TIME_CHANGED, occurredAt: past });
    expect(actor.getSnapshot().context).toMatchObject({
      occurredAtDraft: original,
      occurredAtCustomized: false,
      momentTimeEditorDraft: past,
      momentTimeEditorCustomized: true,
    });

    actor.send({
      type: CHECK_IN_EVENTS.MOMENT_TIME_CHANGED,
      occurredAt: CheckInTimestamp.make('2999-01-01T00:00:00.000Z'),
    });
    expect(actor.getSnapshot().context.momentTimeEditorDraft).toBe(past);

    actor.send({ type: CHECK_IN_EVENTS.MOMENT_TIME_EDITOR_CLOSED });
    expect(actor.getSnapshot().context).toMatchObject({
      occurredAtDraft: original,
      momentTimeEditorDraft: null,
      momentTimeEditorOpen: false,
    });

    actor.send({ type: CHECK_IN_EVENTS.MOMENT_TIME_EDITOR_OPENED });
    actor.send({ type: CHECK_IN_EVENTS.MOMENT_TIME_CHANGED, occurredAt: past });
    actor.send({ type: CHECK_IN_EVENTS.MOMENT_TIME_EDITOR_CONFIRMED });
    expect(actor.getSnapshot().context).toMatchObject({
      occurredAtDraft: past,
      occurredAtCustomized: true,
      momentTimeEditorDraft: null,
      momentTimeEditorOpen: false,
    });
  });

  it('keeps set-to-now provisional when the time editor is dismissed', () => {
    const actor = createActor(appNavigationMachine).start();
    actor.send({ type: CHECK_IN_EVENTS.TOUCH_STARTED });
    actor.send({ type: CHECK_IN_EVENTS.SELECTION_CHANGED, selection });
    actor.send({ type: CHECK_IN_EVENTS.SELECTION_RELEASED });
    const original = actor.getSnapshot().context.occurredAtDraft;

    actor.send({ type: CHECK_IN_EVENTS.MOMENT_TIME_EDITOR_OPENED });
    actor.send({ type: CHECK_IN_EVENTS.MOMENT_TIME_RESET });
    expect(actor.getSnapshot().context.momentTimeEditorDraft).not.toBeNull();
    expect(actor.getSnapshot().context.momentTimeEditorCustomized).toBe(false);
    expect(actor.getSnapshot().context.occurredAtDraft).toBe(original);

    actor.send({ type: CHECK_IN_EVENTS.MOMENT_TIME_EDITOR_CLOSED });
    expect(actor.getSnapshot().context.occurredAtDraft).toBe(original);
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

  it('maps native back requests through onboarding and check-in stack routes', async () => {
    const actor = createActor(appNavigationMachine).start();
    actor.send({ type: NAVIGATION_EVENTS.SETTINGS_OPENED });
    actor.send({ type: ONBOARDING_EVENTS.OPENED });
    actor.send({ type: ONBOARDING_EVENTS.NEXT_REQUESTED });
    expect(routeForStateValue(actor.getSnapshot().value)).toBe(
      APP_ROUTES.ONBOARDING_PULSE,
    );

    actor.send({ type: NAVIGATION_EVENTS.BACK_REQUESTED });
    expect(routeForStateValue(actor.getSnapshot().value)).toBe(APP_ROUTES.ONBOARDING);
    actor.send({ type: NAVIGATION_EVENTS.BACK_REQUESTED });
    expect(routeForStateValue(actor.getSnapshot().value)).toBe(APP_ROUTES.SETTINGS);

    actor.send({ type: NAVIGATION_EVENTS.TODAY_OPENED });
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
    expect(routeForStateValue(actor.getSnapshot().value)).toBe(
      APP_ROUTES.BELIEF_SYSTEM_EDITOR,
    );

    actor.send({ type: NAVIGATION_EVENTS.BACK_REQUESTED });
    expect(routeForStateValue(actor.getSnapshot().value)).toBe(APP_ROUTES.BELIEF_SYSTEM);
    actor.send({ type: NAVIGATION_EVENTS.BACK_REQUESTED });
    expect(routeForStateValue(actor.getSnapshot().value)).toBe(APP_ROUTES.REFLECTION);
    actor.send({ type: NAVIGATION_EVENTS.BACK_REQUESTED });
    expect(routeForStateValue(actor.getSnapshot().value)).toBe(APP_ROUTES.TODAY);
    expect(actor.getSnapshot().context.selection).toBeNull();
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
    expect(routeForStateValue(savedReflection.value)).toBe(APP_ROUTES.BELIEF_SYSTEM);

    actor.send({ type: CHECK_IN_EVENTS.BELIEF_SYSTEM_CATALOG_REQUESTED });
    expect(actor.getSnapshot().matches(CHECK_IN_STATES.BELIEF_SYSTEM_CATALOG)).toBe(true);
    expect(routeForStateValue(actor.getSnapshot().value)).toBe(
      APP_ROUTES.BELIEF_SYSTEM_CATALOG,
    );
    actor.send({
      type: CHECK_IN_EVENTS.BELIEF_SYSTEM_CHANGED,
      beliefSystemId: BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING,
    });
    expect(actor.getSnapshot().matches(CHECK_IN_STATES.BELIEF_SYSTEM)).toBe(true);
    actor.send({ type: CHECK_IN_EVENTS.CONFIRMED });

    const guiding = await waitFor(
      actor,
      (candidate) => candidate.matches(CHECK_IN_STATES.GUIDING_BELIEF),
      { timeout: 1_000 },
    );
    expect(routeForStateValue(guiding.value)).toBe(APP_ROUTES.GUIDING_BELIEF);
    actor.send({ type: CHECK_IN_EVENTS.GUIDING_BELIEF_SKIPPED });
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
    expect(routeForStateValue(actor.getSnapshot().value)).toBe(
      APP_ROUTES.BELIEF_SYSTEM_EDITOR,
    );
    actor.send({
      type: CHECK_IN_EVENTS.BELIEF_SYSTEM_DRAFT_CHANGED,
      statement: 'I must always function.',
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
    });

    actor.send({ type: CHECK_IN_EVENTS.CONFIRMED });
    await waitFor(
      actor,
      (candidate) => candidate.matches(CHECK_IN_STATES.GUIDING_BELIEF),
      { timeout: 1_000 },
    );
    actor.send({
      type: CHECK_IN_EVENTS.GUIDING_BELIEF_SYSTEM_DRAFT_CHANGED,
      statement: 'I may pause and I am still loved.',
    });
    actor.send({ type: CHECK_IN_EVENTS.GUIDING_BELIEF_CONFIRMED });
    const completed = await waitFor(
      actor,
      (candidate) => candidate.matches(CHECK_IN_STATES.SUCCESS),
      { timeout: 1_000 },
    );
    expect(completed.context.saved?.beliefSystemId).toBe(selectedId);
    expect(completed.context.beliefStatements).toContainEqual({
      kind: 'custom',
      beliefSystemId: selectedId,
      harmfulStatement: 'I must always function.',
      guidingStatement: 'I may pause and I am still loved.',
    });
    expect(checkInHistoryStore.getSnapshot().context.entries).toContainEqual(
      expect.objectContaining({
        id: completed.context.saved?.id,
        guidingStatementSnapshot: 'I may pause and I am still loved.',
      }),
    );
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
    actor.send({ type: CHECK_IN_EVENTS.CONFIRMED });
    const guiding = await waitFor(
      actor,
      (candidate) => candidate.matches(CHECK_IN_STATES.GUIDING_BELIEF),
      { timeout: 1_000 },
    );
    expect(routeForStateValue(guiding.value)).toBe(APP_ROUTES.GUIDING_BELIEF);
    actor.send({
      type: CHECK_IN_EVENTS.GUIDING_BELIEF_SYSTEM_DRAFT_CHANGED,
      statement: 'I may pause and I am still loved.',
    });
    actor.send({ type: CHECK_IN_EVENTS.GUIDING_BELIEF_CONFIRMED });

    const persisted = await waitFor(
      actor,
      (candidate) => candidate.matches(CHECK_IN_STATES.SUCCESS),
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

  it('retries an early save without redirecting the user into belief work', async () => {
    failNextSurrealUpsert(new Error('storage unavailable'));
    const actor = createActor(appNavigationMachine).start();
    actor.send({ type: CHECK_IN_EVENTS.TOUCH_STARTED });
    actor.send({ type: CHECK_IN_EVENTS.SELECTION_CHANGED, selection });
    actor.send({ type: CHECK_IN_EVENTS.SELECTION_RELEASED });
    actor.send({ type: CHECK_IN_EVENTS.SAVE_FOR_NOW_REQUESTED });

    await waitFor(
      actor,
      (candidate) => candidate.matches(CHECK_IN_STATES.FAILURE),
      { timeout: 1_000 },
    );
    actor.send({ type: CHECK_IN_EVENTS.RETRIED });
    const completed = await waitFor(
      actor,
      (candidate) => candidate.matches(CHECK_IN_STATES.SUCCESS),
      { timeout: 1_000 },
    );

    expect(completed.context.error).toBeNull();
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
    const guiding = await waitFor(
      actor,
      (candidate) => candidate.matches(CHECK_IN_STATES.GUIDING_BELIEF),
      { timeout: 1_000 },
    );
    expect(guiding.context.saved).toMatchObject({
      id: reflectionId,
      beliefSystemId: BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING,
    });
    actor.send({ type: CHECK_IN_EVENTS.GUIDING_BELIEF_SKIPPED });
    await waitFor(
      actor,
      (candidate) => candidate.matches(CHECK_IN_STATES.SUCCESS),
      { timeout: 1_000 },
    );
  });

  it('loads and updates every editable value without duplicating the moment', async () => {
    const actor = createActor(appNavigationMachine).start();
    actor.send({ type: CHECK_IN_EVENTS.TOUCH_STARTED });
    actor.send({ type: CHECK_IN_EVENTS.SELECTION_CHANGED, selection });
    actor.send({ type: CHECK_IN_EVENTS.SELECTION_RELEASED });
    actor.send({ type: CHECK_IN_EVENTS.NOTE_CHANGED, note: 'Before' });
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
    actor.send({ type: CHECK_IN_EVENTS.CONFIRMED });
    await waitFor(
      actor,
      (candidate) => candidate.matches(CHECK_IN_STATES.GUIDING_BELIEF),
      { timeout: 1_000 },
    );
    actor.send({
      type: CHECK_IN_EVENTS.GUIDING_BELIEF_SYSTEM_DRAFT_CHANGED,
      statement: 'I must keep going.',
    });
    actor.send({ type: CHECK_IN_EVENTS.GUIDING_BELIEF_CONFIRMED });
    const created = await waitFor(
      actor,
      (candidate) => candidate.matches(CHECK_IN_STATES.SUCCESS),
      { timeout: 1_000 },
    );
    const saved = created.context.saved;
    if (!saved) throw new Error('Successful persistence must expose the saved check-in.');

    actor.send({ type: CHECK_IN_EVENTS.RESTARTED });
    expect(actor.getSnapshot().context.selection).toBeNull();
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
    actor.send({
      type: CHECK_IN_EVENTS.BELIEF_SYSTEM_CHANGED,
      beliefSystemId: BELIEF_SYSTEM_IDS.NO_MISTAKES,
    });
    actor.send({ type: CHECK_IN_EVENTS.CONFIRMED });
    await waitFor(
      actor,
      (candidate) => candidate.matches(CHECK_IN_STATES.GUIDING_BELIEF),
      { timeout: 1_000 },
    );
    actor.send({
      type: CHECK_IN_EVENTS.GUIDING_BELIEF_SYSTEM_DRAFT_CHANGED,
      statement: 'Mistakes help me learn.',
    });
    actor.send({ type: CHECK_IN_EVENTS.GUIDING_BELIEF_CONFIRMED });

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
      beliefSystemId: BELIEF_SYSTEM_IDS.NO_MISTAKES,
    });
    expect(actor.getSnapshot().context.beliefStatements).toContainEqual({
      kind: 'built-in',
      beliefSystemId: BELIEF_SYSTEM_IDS.NO_MISTAKES,
      guidingStatement: 'Mistakes help me learn.',
    });

    const updated = entries[0];
    if (!updated) throw new Error('The edited check-in must remain in history.');
    actor.send({ type: CHECK_IN_EVENTS.EDIT_REQUESTED, entry: updated });
    actor.send({ type: CHECK_IN_EVENTS.CONFIRMED });
    await waitFor(
      actor,
      (candidate) => candidate.matches(CHECK_IN_STATES.BELIEF_SYSTEM),
      { timeout: 1_000 },
    );
    actor.send({ type: CHECK_IN_EVENTS.CONFIRMED });
    await waitFor(
      actor,
      (candidate) => candidate.matches(CHECK_IN_STATES.GUIDING_BELIEF),
      { timeout: 1_000 },
    );
    actor.send({
      type: CHECK_IN_EVENTS.GUIDING_BELIEF_SYSTEM_DRAFT_CHANGED,
      statement: '',
    });
    actor.send({ type: CHECK_IN_EVENTS.GUIDING_BELIEF_CONFIRMED });
    await waitFor(
      actor,
      (candidate) => candidate.matches({
        [NAVIGATION_STATES.TABS]: NAVIGATION_STATES.HISTORY,
      }),
      { timeout: 1_000 },
    );

    expect(actor.getSnapshot().context.beliefStatements).not.toContainEqual(
      expect.objectContaining({
        beliefSystemId: BELIEF_SYSTEM_IDS.NO_MISTAKES,
      }),
    );
    expect(mockSurrealQuery).toHaveBeenCalledWith(
      'DELETE $record',
      expect.objectContaining({
        record: expect.objectContaining({
          kind: 'record',
          value: expect.stringContaining(BELIEF_SYSTEM_IDS.NO_MISTAKES),
        }),
      }),
    );
  });
});
