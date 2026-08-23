import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as Haptics from 'expo-haptics';
import { Linking } from 'react-native';
import assert from '@/assert';
import {
  matchesState,
  setup,
  type StateValue,
} from 'xstate';

import {
  APP_ROUTES,
  APP_LOCALES,
  BELIEF_LIBRARY_EVENTS,
  BELIEF_LIBRARY_STATES,
  BELIEF_SYSTEM_FAILURE_MESSAGE,
  BELIEF_STATEMENT_FAILURE_MESSAGE,
  CHECK_IN_EVENTS,
  CHECK_IN_DELETE_FAILURE_MESSAGE,
  CHECK_IN_FAILURE_MESSAGE,
  CHECK_IN_SAVE_DESTINATIONS,
  CHECK_IN_STATES,
  DATA_ARCHIVE_FAILURE_MESSAGE,
  DATA_DELETE_ALL_FAILURE_MESSAGE,
  DATA_EXPORT_FAILURE_MESSAGE,
  DATA_RESTORE_FAILURE_MESSAGE,
  DATA_SAFETY_EVENTS,
  DATA_SAFETY_STATES,
  MAX_NOTE_LENGTH,
  EMOTION_LABEL_MODES,
  MOMENT_TIME_PICKER_MODES,
  NAVIGATION_EVENTS,
  NAVIGATION_STATES,
  ONBOARDING_ENTRY_POINTS,
  ONBOARDING_EVENTS,
  ONBOARDING_STATES,
  REMINDER_EVENTS,
  REMINDER_ENTRY_POINTS,
  MAX_REMINDER_TIMES,
  REMINDER_NOTIFICATION_CONTENT,
  REMINDER_PERMISSION_STATES,
  REMINDER_STATES,
  REMINDER_TARGET_KINDS,
  SETTINGS_EVENTS,
  SETTINGS_FAILURE_MESSAGE,
} from '@/constants';
import {
  CheckInSchema,
  CheckInId,
  CheckInListSchema,
  CheckInTimestamp,
  EmotionSelectionSchema,
  checkInTimestampFromDate,
} from '@/features/check-in/domain/check-in';
import { selectionForCheckIn } from '@/features/check-in/domain/emotion';
import {
  BeliefStatementArchiveTimestamp,
  BeliefStatementListSchema,
  BeliefStatementSchema,
  BeliefSystemId,
  CustomBeliefSystemId,
  CustomBeliefStatementSchema,
  beliefStatementForId,
  createCustomBeliefSystemId,
  isCustomBeliefSystemId,
  recordBeliefStatement,
  removeBeliefStatement,
  type BeliefStatement,
  type CustomBeliefStatement,
} from '@/features/check-in/domain/belief-statement';
import {
  deleteCheckIn,
  loadCheckIns,
  persistCheckIn,
  persistGuidingStatementSnapshot,
} from '@/features/check-in/infrastructure/check-in.repository';
import {
  deleteBeliefStatement,
  loadBeliefStatements,
  persistBeliefStatement,
  retireCustomBeliefStatement,
} from '@/features/check-in/infrastructure/belief-statement.repository';
import { checkInHistoryStore } from '@/features/check-in/application/check-in-history.store';
import {
  DataArchiveSchema,
} from '@/features/data-safety/domain/data-archive';
import {
  deleteAllJournalData,
  exportDataArchive,
  pickDataArchive,
  restoreDataArchive,
} from '@/features/data-safety/infrastructure/data-archive.repository';
import { appSettingsStore } from '@/features/settings/application/app-settings.store';
import { AppLocaleSchema } from '@/features/settings/domain/app-locale';
import { AppSettingsSchema } from '@/features/settings/domain/app-settings';
import { EmotionLabelModeSchema } from '@/features/settings/domain/emotion-label-mode';
import {
  OnboardingEntryPointSchema,
  OnboardingSelectionSchema,
  onboardingExampleSelection,
} from '@/features/onboarding/domain/onboarding';
import {
  loadAppSettings,
  persistAppSettings,
} from '@/features/settings/infrastructure/app-settings.repository';
import {
  activateReminder,
  assignmentForTarget,
  deleteReminder,
  setReminderAssignmentEnabled,
  updateReminder,
  type ReminderTarget,
} from '@/features/reminders/application/reminder-coordinator';
import {
  ReminderAssignmentListSchema,
  ReminderAssignmentId,
  ReminderAssignmentSchema,
  ReminderNotificationContent,
  type ReminderAssignment,
} from '@/features/reminders/domain/reminder-assignment';
import {
  ReminderHour,
  ReminderLocalTime,
  ReminderMinute,
  ReminderWeekday,
  type ReminderTiming,
} from '@/features/reminders/domain/reminder-timing';
import {
  getReminderPermission,
  reconcileReminderNotifications,
  requestReminderPermission,
  sendTestReminder,
} from '@/features/reminders/infrastructure/local-reminder.scheduler';
import { loadReminderData } from '@/features/reminders/infrastructure/reminder.repository';

const AppContextSchema = Schema.Struct({
  selection: Schema.NullOr(EmotionSelectionSchema),
  onboardingSelection: OnboardingSelectionSchema,
  onboardingEntryPoint: Schema.NullOr(OnboardingEntryPointSchema),
  note: Schema.String,
  occurredAtDraft: Schema.NullOr(CheckInTimestamp),
  occurredAtCustomized: Schema.Boolean,
  momentTimeEditorOpen: Schema.Boolean,
  momentTimeEditorDraft: Schema.NullOr(CheckInTimestamp),
  momentTimeEditorCustomized: Schema.Boolean,
  momentTimePickerMode: Schema.NullOr(
    Schema.Literal(...Object.values(MOMENT_TIME_PICKER_MODES)),
  ),
  saveDestination: Schema.Literal(...Object.values(CHECK_IN_SAVE_DESTINATIONS)),
  beliefSystemId: Schema.NullOr(BeliefSystemId),
  beliefStatements: BeliefStatementListSchema,
  beliefStatementsHydrated: Schema.Boolean,
  beliefStatementDraft: Schema.String,
  beliefStatementDraftId: Schema.NullOr(CustomBeliefSystemId),
  guidingBeliefStatementDraft: Schema.String,
  beliefLibraryStatementId: Schema.NullOr(CustomBeliefSystemId),
  beliefLibraryHarmfulDraft: Schema.String,
  beliefLibraryGuidingDraft: Schema.String,
  saved: Schema.NullOr(CheckInSchema),
  editing: Schema.NullOr(CheckInSchema),
  error: Schema.NullOr(Schema.String),
  guidingHelpVisible: Schema.Boolean,
  dataArchive: Schema.NullOr(DataArchiveSchema),
  dataSafetyError: Schema.NullOr(Schema.String),
  dataSafetyNotice: Schema.NullOr(Schema.String),
  reminderAssignments: ReminderAssignmentListSchema,
  reminderDataHydrated: Schema.Boolean,
  reminderTargetKind: Schema.Literal(...Object.values(REMINDER_TARGET_KINDS)),
  reminderTargetBeliefSystemId: Schema.NullOr(BeliefSystemId),
  reminderEntryPoint: Schema.Literal(...Object.values(REMINDER_ENTRY_POINTS)),
  reminderAssignmentDraftId: Schema.NullOr(ReminderAssignmentId),
  reminderNotificationContentDraft: ReminderNotificationContent,
  reminderWeekdaysDraft: Schema.Array(ReminderWeekday),
  reminderTimesDraft: Schema.Array(ReminderLocalTime),
  reminderTimePickerIndex: Schema.NullOr(Schema.NonNegativeInt),
  reminderPermission: Schema.Literal(...Object.values(REMINDER_PERMISSION_STATES)),
  reminderError: Schema.NullOr(Schema.String),
});

const EmptyEventSchema = Schema.standardSchemaV1(Schema.Struct({}));

function customBeliefStatementFromDraft({
  beliefStatementDraft,
  beliefStatementDraftId,
}: {
  beliefStatementDraft: string;
  beliefStatementDraftId: typeof CustomBeliefSystemId.Type | null;
}): BeliefStatement | null {
  const harmfulStatement = beliefStatementDraft.trim();
  if (!harmfulStatement || !beliefStatementDraftId) return null;
  assert(harmfulStatement.length > 0, 'A custom belief requires harmful text.');
  assert(beliefStatementDraftId.length > 0, 'A custom belief requires an identifier.');
  return {
    kind: 'custom',
    beliefSystemId: beliefStatementDraftId,
    harmfulStatement,
  };
}

function guidingBeliefStatementFromDraft({
  beliefStatementDraft,
  beliefStatements,
  beliefSystemId,
  guidingBeliefStatementDraft,
}: {
  beliefStatementDraft: string;
  beliefStatements: readonly BeliefStatement[];
  beliefSystemId: BeliefSystemId | null;
  guidingBeliefStatementDraft: string;
}): BeliefStatement | null {
  if (!beliefSystemId) return null;
  const guidingStatement = guidingBeliefStatementDraft.trim();
  if (!isCustomBeliefSystemId(beliefSystemId)) {
    return guidingStatement
      ? { kind: 'built-in', beliefSystemId, guidingStatement }
      : null;
  }
  const existing = beliefStatementForId({ beliefSystemId, statements: beliefStatements });
  if (existing?.kind !== 'custom') return null;
  const harmfulStatement = beliefStatementDraft.trim();
  if (!harmfulStatement) return null;
  assert(existing.beliefSystemId === beliefSystemId, 'Guiding belief must retain its belief system.');
  assert(harmfulStatement.length > 0, 'A custom guiding belief requires harmful text.');
  return guidingStatement
    ? { ...existing, harmfulStatement, guidingStatement }
    : { kind: 'custom', beliefSystemId, harmfulStatement };
}

function guidingBeliefDrafts({
  beliefStatements,
  beliefSystemId,
}: {
  beliefStatements: readonly BeliefStatement[];
  beliefSystemId: BeliefSystemId;
}) {
  const statement = beliefStatementForId({
    beliefSystemId,
    statements: beliefStatements,
  });
  return {
    beliefStatementDraft: statement?.kind === 'custom'
      ? statement.harmfulStatement
      : '',
    beliefStatementDraftId: null,
    guidingBeliefStatementDraft: statement?.guidingStatement ?? '',
    guidingHelpVisible: false,
    error: null,
  };
}

function beliefLibraryDrafts(statement: CustomBeliefStatement) {
  return {
    beliefLibraryStatementId: statement.beliefSystemId,
    beliefLibraryHarmfulDraft: statement.harmfulStatement,
    beliefLibraryGuidingDraft: statement.guidingStatement ?? '',
    guidingHelpVisible: false,
    error: null,
  };
}

function managedBeliefStatementFromDraft({
  beliefLibraryGuidingDraft,
  beliefLibraryHarmfulDraft,
  beliefLibraryStatementId,
  beliefStatements,
}: {
  beliefLibraryGuidingDraft: string;
  beliefLibraryHarmfulDraft: string;
  beliefLibraryStatementId: CustomBeliefSystemId | null;
  beliefStatements: readonly BeliefStatement[];
}): CustomBeliefStatement | null {
  if (!beliefLibraryStatementId) return null;
  const harmfulStatement = beliefLibraryHarmfulDraft.trim();
  if (!harmfulStatement) return null;
  assert(beliefLibraryStatementId.length > 0, 'A managed belief requires an identifier.');
  assert(harmfulStatement.length > 0, 'A managed belief requires harmful text.');
  const guidingStatement = beliefLibraryGuidingDraft.trim();
  const existing = beliefStatementForId({
    beliefSystemId: beliefLibraryStatementId,
    statements: beliefStatements,
  });
  if (!existing) {
    return guidingStatement
      ? {
          kind: 'custom',
          beliefSystemId: beliefLibraryStatementId,
          harmfulStatement,
          guidingStatement,
        }
      : { kind: 'custom', beliefSystemId: beliefLibraryStatementId, harmfulStatement };
  }
  if (existing.kind !== 'custom' || existing.archivedAt !== undefined) return null;
  return guidingStatement
    ? { ...existing, harmfulStatement, guidingStatement }
    : { kind: 'custom', beliefSystemId: existing.beliefSystemId, harmfulStatement };
}

function reminderTargetForContext({
  reminderTargetBeliefSystemId,
  reminderTargetKind,
}: {
  reminderTargetBeliefSystemId: BeliefSystemId | null;
  reminderTargetKind: typeof REMINDER_TARGET_KINDS[keyof typeof REMINDER_TARGET_KINDS];
}): ReminderTarget | null {
  if (reminderTargetKind === REMINDER_TARGET_KINDS.PULSE) {
    return { targetKind: reminderTargetKind };
  }
  return reminderTargetBeliefSystemId
    ? { targetKind: reminderTargetKind, beliefSystemId: reminderTargetBeliefSystemId }
    : null;
}

function reminderExitState(
  entryPoint: typeof REMINDER_ENTRY_POINTS[keyof typeof REMINDER_ENTRY_POINTS],
) {
  assert(Object.values(REMINDER_ENTRY_POINTS).includes(entryPoint), 'Reminder entry point must be supported.');
  const exitState = [
    { matches: entryPoint === REMINDER_ENTRY_POINTS.SETTINGS, state: REMINDER_STATES.SETTINGS },
    {
      matches: entryPoint === REMINDER_ENTRY_POINTS.CHECK_IN_SUCCESS,
      state: CHECK_IN_STATES.SUCCESS,
    },
    {
      matches: entryPoint === REMINDER_ENTRY_POINTS.NOTIFICATION,
      state: REMINDER_STATES.GUIDING_BELIEF,
    },
  ].find(({ matches }) => matches)?.state ?? BELIEF_LIBRARY_STATES.LIBRARY;
  assert(new Set([
    REMINDER_STATES.SETTINGS,
    CHECK_IN_STATES.SUCCESS,
    REMINDER_STATES.GUIDING_BELIEF,
    BELIEF_LIBRARY_STATES.LIBRARY,
  ]).has(exitState), 'Reminder exit state must be supported.');
  return exitState;
}

function reminderOfferExitState(
  entryPoint: typeof REMINDER_ENTRY_POINTS[keyof typeof REMINDER_ENTRY_POINTS],
) {
  return reminderExitState(entryPoint);
}

function successReminderBeliefSystemId({
  assignments,
  reminderDataHydrated,
  reminderError,
  savedBeliefSystemId,
  statements,
}: {
  assignments: readonly ReminderAssignment[];
  reminderDataHydrated: boolean;
  reminderError: string | null;
  savedBeliefSystemId: BeliefSystemId | undefined;
  statements: readonly BeliefStatement[];
}) {
  if (!reminderDataHydrated || reminderError || !savedBeliefSystemId) return null;
  assert(reminderError === null, 'A reminder offer requires successful hydration.');
  assert(savedBeliefSystemId.length > 0, 'A reminder offer requires a saved belief system.');
  const statement = beliefStatementForId({
    beliefSystemId: savedBeliefSystemId,
    statements,
  });
  if (!statement?.guidingStatement) return null;
  return assignmentForTarget({ assignments, beliefSystemId: savedBeliefSystemId })
    ? null
    : savedBeliefSystemId;
}

function reminderTimingFromDraft({
  reminderTimesDraft,
  reminderWeekdaysDraft,
}: {
  reminderTimesDraft: readonly (typeof ReminderLocalTime.Type)[];
  reminderWeekdaysDraft: readonly (typeof ReminderWeekday.Type)[];
}): ReminderTiming | null {
  if (reminderWeekdaysDraft.length === 0 || reminderTimesDraft.length === 0) return null;
  const [firstWeekday, ...remainingWeekdays] = reminderWeekdaysDraft;
  const [firstTime, ...remainingTimes] = reminderTimesDraft;
  if (!firstWeekday || !firstTime) return null;
  assert(reminderWeekdaysDraft.length > 0, 'Reminder timing requires a weekday.');
  assert(reminderTimesDraft.length <= MAX_REMINDER_TIMES, 'Reminder timing exceeds the supported time count.');
  return {
    weekdays: [firstWeekday, ...remainingWeekdays],
    times: [firstTime, ...remainingTimes],
  };
}

function activateReminderFromDraft({
  context,
  timing,
  self,
}: {
  context: typeof AppContextSchema.Type;
  timing: ReminderTiming;
  self: { send: (event: {
    type: typeof REMINDER_EVENTS.SAVED;
    assignment: ReminderAssignment;
    assignments: readonly ReminderAssignment[];
  } | { type: typeof REMINDER_EVENTS.OPERATION_FAILED; message: string }) => void };
}) {
  const target = reminderTargetForContext(context);
  assert(timing.weekdays.length > 0, 'Reminder activation requires weekdays.');
  assert(timing.times.length > 0, 'Reminder activation requires times.');
  if (!target) {
    self.send({
      type: REMINDER_EVENTS.OPERATION_FAILED,
      message: 'This reminder target is no longer available.',
    });
    return;
  }
  const locale = appSettingsStore.getSnapshot().context.locale;
  void activateReminder({
    assignments: context.reminderAssignments,
    locale,
    notificationContent: context.reminderNotificationContentDraft,
    statements: context.beliefStatements,
    target,
    timing,
  }).then(
    ({ assignment, assignments }) => self.send({
      type: REMINDER_EVENTS.SAVED,
      assignment,
      assignments,
    }),
    () => self.send({
      type: REMINDER_EVENTS.OPERATION_FAILED,
      message: 'Your reminder could not be scheduled.',
    }),
  );
}

function reconcileStoredReminders({
  assignments,
  statements,
}: {
  assignments: readonly ReminderAssignment[];
  statements: readonly BeliefStatement[];
}) {
  void getReminderPermission().then(async (permission) => {
    if (permission === REMINDER_PERMISSION_STATES.GRANTED) {
      await reconcileReminderNotifications({
        assignments,
        locale: appSettingsStore.getSnapshot().context.locale,
        statements,
      });
    }
    return permission;
  }).catch(() => undefined);
}

export const appNavigationMachine = setup({
  states: {
    [NAVIGATION_STATES.STARTING]: {},
    [NAVIGATION_STATES.ONBOARDING]: {
      states: {
        [ONBOARDING_STATES.WELCOME]: {},
        [ONBOARDING_STATES.PULSE]: {},
        [ONBOARDING_STATES.EXAMPLE]: {},
      },
    },
    [NAVIGATION_STATES.TABS]: {
      states: {
        [NAVIGATION_STATES.TODAY]: {
          states: {
            [CHECK_IN_STATES.IDLE]: {},
            [CHECK_IN_STATES.EXPLORING]: {},
          },
        },
        [NAVIGATION_STATES.HISTORY]: {},
        [NAVIGATION_STATES.ANALYTICS]: {},
        [NAVIGATION_STATES.SETTINGS]: {
          states: {
            [DATA_SAFETY_STATES.IDLE]: {},
            [DATA_SAFETY_STATES.EXPORTING]: {},
            [DATA_SAFETY_STATES.PICKING_ARCHIVE]: {},
            [DATA_SAFETY_STATES.RESTORE_PREVIEW]: {},
            [DATA_SAFETY_STATES.RESTORING]: {},
            [DATA_SAFETY_STATES.DELETE_CONFIRMATION]: {},
            [DATA_SAFETY_STATES.DELETING]: {},
          },
        },
      },
    },
    [NAVIGATION_STATES.REFLECTION]: {},
    [CHECK_IN_STATES.SAVING]: {},
    [CHECK_IN_STATES.BELIEF_SYSTEM]: {},
    [CHECK_IN_STATES.BELIEF_SYSTEM_CATALOG]: {},
    [CHECK_IN_STATES.BELIEF_SYSTEM_EDITOR]: {},
    [CHECK_IN_STATES.PERSISTING_BELIEF_STATEMENT]: {},
    [CHECK_IN_STATES.BELIEF_STATEMENT_FAILURE]: {},
    [CHECK_IN_STATES.ATTACHING_BELIEF_SYSTEM]: {},
    [CHECK_IN_STATES.BELIEF_SYSTEM_FAILURE]: {},
    [CHECK_IN_STATES.GUIDING_BELIEF]: {},
    [CHECK_IN_STATES.PERSISTING_GUIDING_BELIEF]: {},
    [CHECK_IN_STATES.GUIDING_BELIEF_FAILURE]: {},
    [CHECK_IN_STATES.SUCCESS]: {},
    [CHECK_IN_STATES.FAILURE]: {},
    [BELIEF_LIBRARY_STATES.LIBRARY]: {},
    [BELIEF_LIBRARY_STATES.EDITOR]: {},
    [BELIEF_LIBRARY_STATES.SAVING]: {},
    [BELIEF_LIBRARY_STATES.RETIRING]: {},
    [REMINDER_STATES.SETTINGS]: {},
    [REMINDER_STATES.CHECKING_PERMISSION]: {},
    [REMINDER_STATES.OFFER]: {},
    [REMINDER_STATES.REQUESTING_PERMISSION]: {},
    [REMINDER_STATES.PERMISSION_DENIED]: {},
    [REMINDER_STATES.EDITOR]: {},
    [REMINDER_STATES.SAVING]: {},
    [REMINDER_STATES.ACTIVE]: {},
    [REMINDER_STATES.GUIDING_BELIEF]: {},
  },
  schemas: {
    context: Schema.standardSchemaV1(AppContextSchema),
    events: {
      [NAVIGATION_EVENTS.BACK_REQUESTED]: EmptyEventSchema,
      [NAVIGATION_EVENTS.TODAY_OPENED]: EmptyEventSchema,
      [NAVIGATION_EVENTS.HISTORY_OPENED]: EmptyEventSchema,
      [NAVIGATION_EVENTS.ANALYTICS_OPENED]: EmptyEventSchema,
      [NAVIGATION_EVENTS.SETTINGS_OPENED]: EmptyEventSchema,
      [ONBOARDING_EVENTS.OPENED]: EmptyEventSchema,
      [ONBOARDING_EVENTS.NEXT_REQUESTED]: EmptyEventSchema,
      [ONBOARDING_EVENTS.BACK_REQUESTED]: EmptyEventSchema,
      [ONBOARDING_EVENTS.SKIPPED]: EmptyEventSchema,
      [ONBOARDING_EVENTS.FINISHED]: EmptyEventSchema,
      [ONBOARDING_EVENTS.TOUCH_STARTED]: EmptyEventSchema,
      [ONBOARDING_EVENTS.SELECTION_CHANGED]: Schema.standardSchemaV1(
        Schema.Struct({ selection: OnboardingSelectionSchema }),
      ),
      [ONBOARDING_EVENTS.SELECTION_CANCELLED]: EmptyEventSchema,
      [ONBOARDING_EVENTS.SELECTION_RELEASED]: EmptyEventSchema,
      [ONBOARDING_EVENTS.EXAMPLE_REQUESTED]: EmptyEventSchema,
      [CHECK_IN_EVENTS.TOUCH_STARTED]: EmptyEventSchema,
      [CHECK_IN_EVENTS.SELECTION_CHANGED]: Schema.standardSchemaV1(
        Schema.Struct({ selection: Schema.NullOr(EmotionSelectionSchema) }),
      ),
      [CHECK_IN_EVENTS.SELECTION_CANCELLED]: EmptyEventSchema,
      [CHECK_IN_EVENTS.SELECTION_RELEASED]: EmptyEventSchema,
      [CHECK_IN_EVENTS.NOTE_CHANGED]: Schema.standardSchemaV1(Schema.Struct({ note: Schema.String })),
      [CHECK_IN_EVENTS.MOMENT_TIME_EDITOR_OPENED]: EmptyEventSchema,
      [CHECK_IN_EVENTS.MOMENT_TIME_EDITOR_CLOSED]: EmptyEventSchema,
      [CHECK_IN_EVENTS.MOMENT_TIME_EDITOR_CONFIRMED]: EmptyEventSchema,
      [CHECK_IN_EVENTS.MOMENT_TIME_DATE_REQUESTED]: EmptyEventSchema,
      [CHECK_IN_EVENTS.MOMENT_TIME_TIME_REQUESTED]: EmptyEventSchema,
      [CHECK_IN_EVENTS.MOMENT_TIME_PICKER_DISMISSED]: EmptyEventSchema,
      [CHECK_IN_EVENTS.MOMENT_TIME_CHANGED]: Schema.standardSchemaV1(
        Schema.Struct({ occurredAt: CheckInTimestamp }),
      ),
      [CHECK_IN_EVENTS.MOMENT_TIME_RESET]: EmptyEventSchema,
      [CHECK_IN_EVENTS.SAVE_FOR_NOW_REQUESTED]: EmptyEventSchema,
      [CHECK_IN_EVENTS.BELIEF_SYSTEM_CHANGED]: Schema.standardSchemaV1(
        Schema.Struct({ beliefSystemId: Schema.NullOr(BeliefSystemId) }),
      ),
      [CHECK_IN_EVENTS.BELIEF_SYSTEM_BACK_REQUESTED]: EmptyEventSchema,
      [CHECK_IN_EVENTS.BELIEF_SYSTEM_CATALOG_REQUESTED]: EmptyEventSchema,
      [CHECK_IN_EVENTS.BELIEF_SYSTEM_CATALOG_CLOSED]: EmptyEventSchema,
      [CHECK_IN_EVENTS.CUSTOM_BELIEF_SYSTEM_REQUESTED]: EmptyEventSchema,
      [CHECK_IN_EVENTS.BELIEF_SYSTEM_EDITOR_CANCELLED]: EmptyEventSchema,
      [CHECK_IN_EVENTS.BELIEF_SYSTEM_DRAFT_CHANGED]: Schema.standardSchemaV1(
        Schema.Struct({ statement: Schema.String }),
      ),
      [CHECK_IN_EVENTS.GUIDING_BELIEF_SYSTEM_DRAFT_CHANGED]: Schema.standardSchemaV1(
        Schema.Struct({ statement: Schema.String }),
      ),
      [CHECK_IN_EVENTS.GUIDING_BELIEF_HELP_TOGGLED]: EmptyEventSchema,
      [CHECK_IN_EVENTS.BELIEF_SYSTEM_EDITOR_CONFIRMED]: EmptyEventSchema,
      [CHECK_IN_EVENTS.GUIDING_BELIEF_BACK_REQUESTED]: EmptyEventSchema,
      [CHECK_IN_EVENTS.GUIDING_BELIEF_SKIPPED]: EmptyEventSchema,
      [CHECK_IN_EVENTS.GUIDING_BELIEF_CONFIRMED]: EmptyEventSchema,
      [CHECK_IN_EVENTS.BELIEF_STATEMENTS_HYDRATED]: Schema.standardSchemaV1(
        Schema.Struct({ statements: BeliefStatementListSchema }),
      ),
      [CHECK_IN_EVENTS.BELIEF_STATEMENTS_HYDRATION_FAILED]: Schema.standardSchemaV1(
        Schema.Struct({ message: Schema.String }),
      ),
      [CHECK_IN_EVENTS.BELIEF_STATEMENT_PERSISTED]: Schema.standardSchemaV1(
        Schema.Struct({ statement: BeliefStatementSchema }),
      ),
      [CHECK_IN_EVENTS.BELIEF_STATEMENT_REMOVED]: Schema.standardSchemaV1(
        Schema.Struct({ beliefSystemId: BeliefSystemId }),
      ),
      [CHECK_IN_EVENTS.BELIEF_STATEMENT_PERSISTENCE_FAILED]: Schema.standardSchemaV1(
        Schema.Struct({ message: Schema.String }),
      ),
      [CHECK_IN_EVENTS.CONFIRMED]: EmptyEventSchema,
      [CHECK_IN_EVENTS.PERSISTED]: Schema.standardSchemaV1(Schema.Struct({ saved: CheckInSchema })),
      [CHECK_IN_EVENTS.FAILED]: Schema.standardSchemaV1(Schema.Struct({ message: Schema.String })),
      [CHECK_IN_EVENTS.HISTORY_HYDRATED]: Schema.standardSchemaV1(
        Schema.Struct({ entries: CheckInListSchema }),
      ),
      [CHECK_IN_EVENTS.HISTORY_HYDRATION_FAILED]: Schema.standardSchemaV1(
        Schema.Struct({ message: Schema.String }),
      ),
      [CHECK_IN_EVENTS.EDIT_REQUESTED]: Schema.standardSchemaV1(
        Schema.Struct({ entry: CheckInSchema }),
      ),
      [CHECK_IN_EVENTS.EDIT_SELECTION_REQUESTED]: EmptyEventSchema,
      [CHECK_IN_EVENTS.DELETE_REQUESTED]: Schema.standardSchemaV1(
        Schema.Struct({ id: CheckInId }),
      ),
      [CHECK_IN_EVENTS.DELETED]: Schema.standardSchemaV1(Schema.Struct({ id: CheckInId })),
      [CHECK_IN_EVENTS.DELETE_FAILED]: Schema.standardSchemaV1(
        Schema.Struct({ message: Schema.String }),
      ),
      [CHECK_IN_EVENTS.RETRIED]: EmptyEventSchema,
      [CHECK_IN_EVENTS.RESTARTED]: EmptyEventSchema,
      [CHECK_IN_EVENTS.REFLECTION_CANCELLED]: EmptyEventSchema,
      [SETTINGS_EVENTS.EMOTION_LABEL_MODE_CHANGED]: Schema.standardSchemaV1(
        Schema.Struct({ mode: EmotionLabelModeSchema }),
      ),
      [SETTINGS_EVENTS.LANGUAGE_CHANGED]: Schema.standardSchemaV1(
        Schema.Struct({ locale: AppLocaleSchema }),
      ),
      [SETTINGS_EVENTS.APP_SETTINGS_HYDRATED]: Schema.standardSchemaV1(
        Schema.Struct({ settings: AppSettingsSchema }),
      ),
      [SETTINGS_EVENTS.APP_SETTINGS_HYDRATION_FAILED]: Schema.standardSchemaV1(
        Schema.Struct({ message: Schema.String }),
      ),
      [SETTINGS_EVENTS.APP_SETTINGS_PERSISTENCE_FAILED]: Schema.standardSchemaV1(
        Schema.Struct({ message: Schema.String }),
      ),
      [DATA_SAFETY_EVENTS.EXPORT_REQUESTED]: EmptyEventSchema,
      [DATA_SAFETY_EVENTS.EXPORT_SUCCEEDED]: EmptyEventSchema,
      [DATA_SAFETY_EVENTS.RESTORE_REQUESTED]: EmptyEventSchema,
      [DATA_SAFETY_EVENTS.ARCHIVE_PICKED]: Schema.standardSchemaV1(
        Schema.Struct({ archive: DataArchiveSchema }),
      ),
      [DATA_SAFETY_EVENTS.PICK_CANCELLED]: EmptyEventSchema,
      [DATA_SAFETY_EVENTS.RESTORE_CONFIRMED]: EmptyEventSchema,
      [DATA_SAFETY_EVENTS.RESTORE_CANCELLED]: EmptyEventSchema,
      [DATA_SAFETY_EVENTS.RESTORE_SUCCEEDED]: Schema.standardSchemaV1(
        Schema.Struct({ archive: DataArchiveSchema }),
      ),
      [DATA_SAFETY_EVENTS.DELETE_REQUESTED]: EmptyEventSchema,
      [DATA_SAFETY_EVENTS.DELETE_CONFIRMED]: EmptyEventSchema,
      [DATA_SAFETY_EVENTS.DELETE_CANCELLED]: EmptyEventSchema,
      [DATA_SAFETY_EVENTS.DELETE_SUCCEEDED]: EmptyEventSchema,
      [DATA_SAFETY_EVENTS.OPERATION_FAILED]: Schema.standardSchemaV1(
        Schema.Struct({ message: Schema.String }),
      ),
      [DATA_SAFETY_EVENTS.NOTICE_DISMISSED]: EmptyEventSchema,
      [BELIEF_LIBRARY_EVENTS.OPENED]: EmptyEventSchema,
      [BELIEF_LIBRARY_EVENTS.CLOSED]: EmptyEventSchema,
      [BELIEF_LIBRARY_EVENTS.CREATE_REQUESTED]: EmptyEventSchema,
      [BELIEF_LIBRARY_EVENTS.EDIT_REQUESTED]: Schema.standardSchemaV1(
        Schema.Struct({ beliefSystemId: CustomBeliefSystemId }),
      ),
      [BELIEF_LIBRARY_EVENTS.EDIT_CANCELLED]: EmptyEventSchema,
      [BELIEF_LIBRARY_EVENTS.HARMFUL_DRAFT_CHANGED]: Schema.standardSchemaV1(
        Schema.Struct({ statement: Schema.String }),
      ),
      [BELIEF_LIBRARY_EVENTS.GUIDING_DRAFT_CHANGED]: Schema.standardSchemaV1(
        Schema.Struct({ statement: Schema.String }),
      ),
      [BELIEF_LIBRARY_EVENTS.GUIDING_HELP_TOGGLED]: EmptyEventSchema,
      [BELIEF_LIBRARY_EVENTS.SAVE_REQUESTED]: EmptyEventSchema,
      [BELIEF_LIBRARY_EVENTS.REMOVE_REQUESTED]: Schema.standardSchemaV1(
        Schema.Struct({ beliefSystemId: CustomBeliefSystemId }),
      ),
      [BELIEF_LIBRARY_EVENTS.STATEMENT_SAVED]: Schema.standardSchemaV1(
        Schema.Struct({ statement: CustomBeliefStatementSchema }),
      ),
      [BELIEF_LIBRARY_EVENTS.STATEMENT_RETIRED]: Schema.standardSchemaV1(
        Schema.Struct({
          beliefSystemId: CustomBeliefSystemId,
          archivedStatement: Schema.NullOr(CustomBeliefStatementSchema),
        }),
      ),
      [BELIEF_LIBRARY_EVENTS.OPERATION_FAILED]: Schema.standardSchemaV1(
        Schema.Struct({ message: Schema.String }),
      ),
      [REMINDER_EVENTS.OPENED]: EmptyEventSchema,
      [REMINDER_EVENTS.HYDRATED]: Schema.standardSchemaV1(Schema.Struct({
        assignments: ReminderAssignmentListSchema,
      })),
      [REMINDER_EVENTS.HYDRATION_FAILED]: Schema.standardSchemaV1(
        Schema.Struct({ message: Schema.String }),
      ),
      [REMINDER_EVENTS.RETRY_REQUESTED]: EmptyEventSchema,
      [REMINDER_EVENTS.OFFER_ACCEPTED]: EmptyEventSchema,
      [REMINDER_EVENTS.SUCCESS_OFFER_ACCEPTED]: EmptyEventSchema,
      [REMINDER_EVENTS.OFFER_DECLINED]: EmptyEventSchema,
      [REMINDER_EVENTS.PERMISSION_RESOLVED]: Schema.standardSchemaV1(Schema.Struct({
        permission: Schema.Literal(...Object.values(REMINDER_PERMISSION_STATES)),
      })),
      [REMINDER_EVENTS.PERMISSION_FAILED]: Schema.standardSchemaV1(
        Schema.Struct({ message: Schema.String }),
      ),
      [REMINDER_EVENTS.SETTINGS_REQUESTED]: EmptyEventSchema,
      [REMINDER_EVENTS.SETTINGS_RETURNED]: EmptyEventSchema,
      [REMINDER_EVENTS.TARGET_SELECTED]: Schema.standardSchemaV1(Schema.Struct({
        beliefSystemId: BeliefSystemId,
      })),
      [REMINDER_EVENTS.ASSIGNMENT_EDIT_REQUESTED]: Schema.standardSchemaV1(Schema.Struct({
        assignmentId: ReminderAssignmentId,
      })),
      [REMINDER_EVENTS.CREATE_REQUESTED]: EmptyEventSchema,
      [REMINDER_EVENTS.CONTENT_CHANGED]: Schema.standardSchemaV1(
        Schema.Struct({ notificationContent: ReminderNotificationContent }),
      ),
      [REMINDER_EVENTS.WEEKDAY_TOGGLED]: Schema.standardSchemaV1(
        Schema.Struct({ weekday: ReminderWeekday }),
      ),
      [REMINDER_EVENTS.TIME_SHIFTED]: Schema.standardSchemaV1(Schema.Struct({
        index: Schema.NonNegativeInt,
        minutes: Schema.Literal(-30, 30),
      })),
      [REMINDER_EVENTS.TIME_PICKER_REQUESTED]: Schema.standardSchemaV1(Schema.Struct({
        index: Schema.NonNegativeInt,
      })),
      [REMINDER_EVENTS.TIME_PICKER_DISMISSED]: EmptyEventSchema,
      [REMINDER_EVENTS.TIME_CHANGED]: Schema.standardSchemaV1(Schema.Struct({
        index: Schema.NonNegativeInt,
        hour: ReminderHour,
        minute: ReminderMinute,
      })),
      [REMINDER_EVENTS.TIME_ADDED]: EmptyEventSchema,
      [REMINDER_EVENTS.TIME_REMOVED]: Schema.standardSchemaV1(Schema.Struct({
        index: Schema.NonNegativeInt,
      })),
      [REMINDER_EVENTS.SAVE_REQUESTED]: EmptyEventSchema,
      [REMINDER_EVENTS.SAVED]: Schema.standardSchemaV1(Schema.Struct({
        assignment: ReminderAssignmentSchema,
        assignments: ReminderAssignmentListSchema,
      })),
      [REMINDER_EVENTS.ASSIGNMENT_TOGGLED]: Schema.standardSchemaV1(Schema.Struct({
        assignmentId: ReminderAssignmentId,
      })),
      [REMINDER_EVENTS.ASSIGNMENT_UPDATED]: Schema.standardSchemaV1(Schema.Struct({
        assignments: ReminderAssignmentListSchema,
      })),
      [REMINDER_EVENTS.ASSIGNMENT_DELETE_REQUESTED]: Schema.standardSchemaV1(Schema.Struct({
        assignmentId: ReminderAssignmentId,
      })),
      [REMINDER_EVENTS.ASSIGNMENT_DELETED]: Schema.standardSchemaV1(Schema.Struct({
        assignments: ReminderAssignmentListSchema,
      })),
      [REMINDER_EVENTS.RECONCILE_REQUESTED]: EmptyEventSchema,
      [REMINDER_EVENTS.OPERATION_FAILED]: Schema.standardSchemaV1(
        Schema.Struct({ message: Schema.String }),
      ),
      [REMINDER_EVENTS.DONE]: EmptyEventSchema,
      [REMINDER_EVENTS.TEST_REQUESTED]: EmptyEventSchema,
      [REMINDER_EVENTS.OPEN_PULSE_REQUESTED]: EmptyEventSchema,
      [REMINDER_EVENTS.EDIT_REQUESTED]: EmptyEventSchema,
      [REMINDER_EVENTS.NOTIFICATION_OPENED]: Schema.standardSchemaV1(Schema.Struct({
        assignmentId: ReminderAssignmentId,
        targetKind: Schema.Literal(...Object.values(REMINDER_TARGET_KINDS)),
        beliefSystemId: Schema.optional(BeliefSystemId),
      })),
    },
  },
}).createMachine({
  id: 'appNavigation',
  initial: NAVIGATION_STATES.STARTING,
  context: {
    selection: null,
    onboardingSelection: null,
    onboardingEntryPoint: null,
    note: '',
    occurredAtDraft: null,
    occurredAtCustomized: false,
    momentTimeEditorOpen: false,
    momentTimeEditorDraft: null,
    momentTimeEditorCustomized: false,
    momentTimePickerMode: null,
    saveDestination: CHECK_IN_SAVE_DESTINATIONS.BELIEF_SYSTEM,
    beliefSystemId: null,
    beliefStatements: [],
    beliefStatementsHydrated: false,
    beliefStatementDraft: '',
    beliefStatementDraftId: null,
    guidingBeliefStatementDraft: '',
    beliefLibraryStatementId: null,
    beliefLibraryHarmfulDraft: '',
    beliefLibraryGuidingDraft: '',
    saved: null,
    editing: null,
    error: null,
    guidingHelpVisible: false,
    dataArchive: null,
    dataSafetyError: null,
    dataSafetyNotice: null,
    reminderAssignments: [],
    reminderDataHydrated: false,
    reminderTargetKind: REMINDER_TARGET_KINDS.PULSE,
    reminderTargetBeliefSystemId: null,
    reminderEntryPoint: REMINDER_ENTRY_POINTS.BELIEF_LIBRARY,
    reminderAssignmentDraftId: null,
    reminderNotificationContentDraft: REMINDER_NOTIFICATION_CONTENT.GENERAL,
    reminderWeekdaysDraft: [2, 3, 4, 5, 6],
    reminderTimesDraft: [{ hour: 9, minute: 0 }],
    reminderTimePickerIndex: null,
    reminderPermission: REMINDER_PERMISSION_STATES.UNDETERMINED,
    reminderError: null,
  },
  entry: ({ self }, enq) => {
    enq(() => {
      assert(self.getSnapshot().status !== 'stopped', 'Startup hydration requires an active actor.');
      assert(Schema.is(AppContextSchema)(self.getSnapshot().context), 'Startup context must satisfy the app schema.');
      void Effect.runPromise(loadCheckIns).then(
        (entries) => self.send({ type: CHECK_IN_EVENTS.HISTORY_HYDRATED, entries }),
        () => self.send({
          type: CHECK_IN_EVENTS.HISTORY_HYDRATION_FAILED,
          message: CHECK_IN_FAILURE_MESSAGE,
        }),
      );
      void Effect.runPromise(loadAppSettings).then(
        (settings) => self.send({ type: SETTINGS_EVENTS.APP_SETTINGS_HYDRATED, settings }),
        () => self.send({
          type: SETTINGS_EVENTS.APP_SETTINGS_HYDRATION_FAILED,
          message: SETTINGS_FAILURE_MESSAGE,
        }),
      );
      void Effect.runPromise(loadBeliefStatements).then(
        (statements) => self.send({
          type: CHECK_IN_EVENTS.BELIEF_STATEMENTS_HYDRATED,
          statements,
        }),
        () => self.send({
          type: CHECK_IN_EVENTS.BELIEF_STATEMENTS_HYDRATION_FAILED,
          message: BELIEF_STATEMENT_FAILURE_MESSAGE,
        }),
      );
      void Effect.runPromise(loadReminderData).then(
        (assignments) => self.send({
          type: REMINDER_EVENTS.HYDRATED,
          assignments,
        }),
        () => self.send({
          type: REMINDER_EVENTS.HYDRATION_FAILED,
          message: 'Your reminders could not be loaded.',
        }),
      );
    });
  },
  on: {
    [CHECK_IN_EVENTS.HISTORY_HYDRATED]: ({ event }, enq) => {
      enq(() => checkInHistoryStore.trigger.hydrated({ entries: event.entries }));
    },
    [CHECK_IN_EVENTS.HISTORY_HYDRATION_FAILED]: ({ event }, enq) => {
      enq(() => checkInHistoryStore.trigger.hydrationFailed({ message: event.message }));
    },
    [CHECK_IN_EVENTS.BELIEF_STATEMENTS_HYDRATED]: ({ context, event }, enq) => {
      assert(Schema.is(BeliefStatementListSchema)(event.statements), 'Hydrated belief statements must satisfy the domain schema.');
      assert(Schema.is(BeliefStatementListSchema)(context.beliefStatements), 'Existing belief statements must satisfy the domain schema.');
      const beliefStatements = event.statements.reduce(
          (statements, statement) => recordBeliefStatement({
            statement,
            statements,
          }),
          context.beliefStatements,
        );
      enq(() => reconcileStoredReminders({
        assignments: context.reminderAssignments,
        statements: beliefStatements,
      }));
      return { context: { beliefStatements, beliefStatementsHydrated: true } };
    },
    [CHECK_IN_EVENTS.BELIEF_STATEMENTS_HYDRATION_FAILED]: {
      context: ({ event }) => ({ error: event.message, beliefStatementsHydrated: true }),
    },
    [REMINDER_EVENTS.HYDRATED]: ({ context, event }, enq) => {
      enq(() => reconcileStoredReminders({
        assignments: event.assignments,
        statements: context.beliefStatements,
      }));
      return { context: {
        reminderAssignments: event.assignments,
        reminderDataHydrated: true,
        reminderError: null,
      } };
    },
    [REMINDER_EVENTS.HYDRATION_FAILED]: {
      context: ({ event }) => ({ reminderDataHydrated: true, reminderError: event.message }),
    },
    [REMINDER_EVENTS.RECONCILE_REQUESTED]: ({ context }, enq) => {
      enq(() => reconcileStoredReminders({
        assignments: context.reminderAssignments,
        statements: context.beliefStatements,
      }));
    },
    [REMINDER_EVENTS.NOTIFICATION_OPENED]: ({ event }) => {
      assert(event.assignmentId.length > 0, 'Opened reminder requires an assignment identifier.');
      assert(event.targetKind === REMINDER_TARGET_KINDS.PULSE || event.beliefSystemId !== undefined, 'Guiding-belief notification requires a belief identifier.');
      if (event.targetKind === REMINDER_TARGET_KINDS.PULSE) {
        return { target: `#appNavigation.${NAVIGATION_STATES.TABS}.${NAVIGATION_STATES.TODAY}` };
      }
      if (!event.beliefSystemId) return undefined;
      return {
        target: `#appNavigation.${REMINDER_STATES.GUIDING_BELIEF}`,
        context: {
          reminderAssignmentDraftId: event.assignmentId,
          reminderEntryPoint: REMINDER_ENTRY_POINTS.NOTIFICATION,
          reminderTargetBeliefSystemId: event.beliefSystemId,
          reminderTargetKind: REMINDER_TARGET_KINDS.GUIDING_BELIEF,
        },
      };
    },
    [CHECK_IN_EVENTS.DELETE_REQUESTED]: ({ event, self }, enq) => {
      enq(() => {
        void Effect.runPromise(deleteCheckIn(event.id)).then(
          () => self.send({ type: CHECK_IN_EVENTS.DELETED, id: event.id }),
          () => self.send({
            type: CHECK_IN_EVENTS.DELETE_FAILED,
            message: CHECK_IN_DELETE_FAILURE_MESSAGE,
          }),
        );
      });
    },
    [CHECK_IN_EVENTS.DELETED]: ({ context, event }, enq) => {
      assert(event.id.length > 0, 'Deleted check-in requires an identifier.');
      assert(context.editing === null || context.editing.id.length > 0, 'Editing check-in requires an identifier.');
      enq(() => checkInHistoryStore.trigger.deleted({ id: event.id }));
      if (context.editing?.id !== event.id) return undefined;
      return {
        target: `#appNavigation.${NAVIGATION_STATES.TABS}.${NAVIGATION_STATES.HISTORY}`,
        context: {
          selection: null,
          note: '',
          beliefSystemId: null,
          saved: null,
          editing: null,
          error: null,
        },
      };
    },
    [CHECK_IN_EVENTS.DELETE_FAILED]: ({ event }, enq) => {
      enq(() => checkInHistoryStore.trigger.deletionFailed({ message: event.message }));
    },
    [SETTINGS_EVENTS.EMOTION_LABEL_MODE_CHANGED]: ({ event, self }, enq) => {
      enq(() => {
        assert(Object.values(EMOTION_LABEL_MODES).includes(event.mode), 'Emotion label mode must be supported.');
        assert(Schema.is(AppSettingsSchema)(appSettingsStore.getSnapshot().context), 'Current settings must satisfy their domain schema.');
        appSettingsStore.trigger.emotionLabelModeChanged({ mode: event.mode });
        const {
          locale,
          onboardingCompleted,
        } = appSettingsStore.getSnapshot().context;
        void Effect.runPromise(persistAppSettings({
          locale,
          emotionLabelMode: event.mode,
          onboardingCompleted,
        })).catch(() => self.send({
          type: SETTINGS_EVENTS.APP_SETTINGS_PERSISTENCE_FAILED,
          message: SETTINGS_FAILURE_MESSAGE,
        }));
      });
    },
    [SETTINGS_EVENTS.LANGUAGE_CHANGED]: ({ event, self }, enq) => {
      enq(() => {
        assert(Object.values(APP_LOCALES).includes(event.locale), 'App locale must be supported.');
        assert(Schema.is(AppSettingsSchema)(appSettingsStore.getSnapshot().context), 'Current settings must satisfy their domain schema.');
        appSettingsStore.trigger.languageChanged({ locale: event.locale });
        const {
          emotionLabelMode,
          onboardingCompleted,
        } = appSettingsStore.getSnapshot().context;
        void Effect.runPromise(persistAppSettings({
          locale: event.locale,
          emotionLabelMode,
          onboardingCompleted,
        })).catch(() => self.send({
          type: SETTINGS_EVENTS.APP_SETTINGS_PERSISTENCE_FAILED,
          message: SETTINGS_FAILURE_MESSAGE,
        }));
      });
    },
    [SETTINGS_EVENTS.APP_SETTINGS_HYDRATED]: ({ event }, enq) => {
      enq(() => appSettingsStore.trigger.hydrated({ settings: event.settings }));
    },
    [SETTINGS_EVENTS.APP_SETTINGS_HYDRATION_FAILED]: ({ event }, enq) => {
      enq(() => appSettingsStore.trigger.hydrationFailed({ message: event.message }));
    },
    [SETTINGS_EVENTS.APP_SETTINGS_PERSISTENCE_FAILED]: ({ event }, enq) => {
      enq(() => appSettingsStore.trigger.persistenceFailed({ message: event.message }));
    },
  },
  states: {
    [NAVIGATION_STATES.STARTING]: {
      always: () => {
        const settings = appSettingsStore.getSnapshot().context;
        assert(settings.locale.length > 0, 'Startup settings require a locale.');
        assert(Object.values(EMOTION_LABEL_MODES).includes(settings.emotionLabelMode), 'Startup settings require a label mode.');
        if (!settings.hydrated) return undefined;
        return settings.onboardingCompleted
          ? { target: `#appNavigation.${NAVIGATION_STATES.TABS}` }
          : {
              target: `#appNavigation.${NAVIGATION_STATES.ONBOARDING}`,
              context: {
                onboardingEntryPoint: ONBOARDING_ENTRY_POINTS.FIRST_LAUNCH,
                onboardingSelection: null,
              },
            };
      },
      on: {
        [SETTINGS_EVENTS.APP_SETTINGS_HYDRATED]: ({ event }, enq) => {
          enq(() => appSettingsStore.trigger.hydrated({ settings: event.settings }));
          return event.settings.onboardingCompleted
            ? { target: `#appNavigation.${NAVIGATION_STATES.TABS}` }
            : {
                target: `#appNavigation.${NAVIGATION_STATES.ONBOARDING}`,
                context: {
                  onboardingEntryPoint: ONBOARDING_ENTRY_POINTS.FIRST_LAUNCH,
                  onboardingSelection: null,
                },
              };
        },
        [SETTINGS_EVENTS.APP_SETTINGS_HYDRATION_FAILED]: ({ event }, enq) => {
          enq(() => appSettingsStore.trigger.hydrationFailed({ message: event.message }));
          return {
            target: `#appNavigation.${NAVIGATION_STATES.ONBOARDING}`,
            context: {
              onboardingEntryPoint: ONBOARDING_ENTRY_POINTS.FIRST_LAUNCH,
              onboardingSelection: null,
            },
          };
        },
      },
    },
    [NAVIGATION_STATES.ONBOARDING]: {
      initial: ONBOARDING_STATES.WELCOME,
      on: {
        [ONBOARDING_EVENTS.SKIPPED]: ({ context, self }, enq) => {
          assert(context.onboardingEntryPoint !== null, 'Skipping onboarding requires an entry point.');
          assert(context.onboardingSelection === null || context.onboardingSelection.intensity >= 0, 'Onboarding intensity cannot be negative.');
          const firstLaunch = (
            context.onboardingEntryPoint === ONBOARDING_ENTRY_POINTS.FIRST_LAUNCH
          );
          if (firstLaunch) {
            enq(() => {
              assert(!appSettingsStore.getSnapshot().context.onboardingCompleted, 'Skipped first launch must not already be complete.');
              assert(Schema.is(AppSettingsSchema)(appSettingsStore.getSnapshot().context), 'Settings must be valid before onboarding completion.');
              appSettingsStore.trigger.onboardingCompletedChanged({ completed: true });
              const {
                emotionLabelMode,
                locale,
              } = appSettingsStore.getSnapshot().context;
              void Effect.runPromise(persistAppSettings({
                locale,
                emotionLabelMode,
                onboardingCompleted: true,
              })).catch(() => self.send({
                type: SETTINGS_EVENTS.APP_SETTINGS_PERSISTENCE_FAILED,
                message: SETTINGS_FAILURE_MESSAGE,
              }));
            });
          }
          return {
            target: firstLaunch
              ? `#appNavigation.${NAVIGATION_STATES.TABS}`
              : `#appNavigation.${NAVIGATION_STATES.TABS}.${NAVIGATION_STATES.SETTINGS}`,
            context: {
              onboardingEntryPoint: null,
              onboardingSelection: null,
            },
          };
        },
        [ONBOARDING_EVENTS.FINISHED]: ({ context, self }, enq) => {
          assert(context.onboardingEntryPoint !== null, 'Finishing onboarding requires an entry point.');
          assert(Schema.is(AppContextSchema)(context), 'Finished onboarding requires valid app context.');
          const firstLaunch = (
            context.onboardingEntryPoint === ONBOARDING_ENTRY_POINTS.FIRST_LAUNCH
          );
          if (firstLaunch) {
            enq(() => {
              assert(Schema.is(AppSettingsSchema)(appSettingsStore.getSnapshot().context), 'Settings must be valid before onboarding completion.');
              assert(Object.values(APP_LOCALES).includes(appSettingsStore.getSnapshot().context.locale), 'Onboarding completion requires a supported locale.');
              appSettingsStore.trigger.onboardingCompletedChanged({ completed: true });
              const {
                emotionLabelMode,
                locale,
              } = appSettingsStore.getSnapshot().context;
              void Effect.runPromise(persistAppSettings({
                locale,
                emotionLabelMode,
                onboardingCompleted: true,
              })).catch(() => self.send({
                type: SETTINGS_EVENTS.APP_SETTINGS_PERSISTENCE_FAILED,
                message: SETTINGS_FAILURE_MESSAGE,
              }));
            });
          }
          return {
            target: firstLaunch
              ? `#appNavigation.${NAVIGATION_STATES.TABS}`
              : `#appNavigation.${NAVIGATION_STATES.TABS}.${NAVIGATION_STATES.SETTINGS}`,
            context: {
              onboardingEntryPoint: null,
              onboardingSelection: null,
            },
          };
        },
      },
      states: {
        [ONBOARDING_STATES.WELCOME]: {
          on: {
            [NAVIGATION_EVENTS.BACK_REQUESTED]: ({ context }) => (
              context.onboardingEntryPoint === ONBOARDING_ENTRY_POINTS.SETTINGS
                ? {
                    target: `#appNavigation.${NAVIGATION_STATES.TABS}.${NAVIGATION_STATES.SETTINGS}`,
                    context: {
                      onboardingEntryPoint: null,
                      onboardingSelection: null,
                    },
                  }
                : undefined
            ),
            [ONBOARDING_EVENTS.NEXT_REQUESTED]: {
              target: ONBOARDING_STATES.PULSE,
            },
          },
        },
        [ONBOARDING_STATES.PULSE]: {
          on: {
            [NAVIGATION_EVENTS.BACK_REQUESTED]: {
              target: ONBOARDING_STATES.WELCOME,
              context: { onboardingSelection: null },
            },
            [ONBOARDING_EVENTS.BACK_REQUESTED]: {
              target: ONBOARDING_STATES.WELCOME,
              context: { onboardingSelection: null },
            },
            [ONBOARDING_EVENTS.SELECTION_CHANGED]: ({ context, event }, enq) => {
              if (
                event.selection
                && event.selection.level !== context.onboardingSelection?.level
              ) {
                enq(() => { void Haptics.selectionAsync(); });
              }
              return { context: { onboardingSelection: event.selection } };
            },
            [ONBOARDING_EVENTS.SELECTION_CANCELLED]: {
              context: { onboardingSelection: null },
            },
            [ONBOARDING_EVENTS.EXAMPLE_REQUESTED]: {
              context: { onboardingSelection: onboardingExampleSelection },
            },
            [ONBOARDING_EVENTS.NEXT_REQUESTED]: ({ context }) => (
              context.onboardingSelection
                ? {
                    target: ONBOARDING_STATES.EXAMPLE,
                    context: { onboardingSelection: onboardingExampleSelection },
                  }
                : undefined
            ),
          },
        },
        [ONBOARDING_STATES.EXAMPLE]: {
          on: {
            [NAVIGATION_EVENTS.BACK_REQUESTED]: {
              target: ONBOARDING_STATES.PULSE,
            },
            [ONBOARDING_EVENTS.BACK_REQUESTED]: {
              target: ONBOARDING_STATES.PULSE,
            },
          },
        },
      },
    },
    [NAVIGATION_STATES.TABS]: {
      initial: NAVIGATION_STATES.TODAY,
      on: {
        [NAVIGATION_EVENTS.TODAY_OPENED]: {
          target: `.${NAVIGATION_STATES.TODAY}`,
          context: {
            selection: null,
            note: '',
            saveDestination: CHECK_IN_SAVE_DESTINATIONS.BELIEF_SYSTEM,
            beliefSystemId: null,
            saved: null,
            editing: null,
            error: null,
            dataArchive: null,
            dataSafetyError: null,
            dataSafetyNotice: null,
          },
        },
        [NAVIGATION_EVENTS.HISTORY_OPENED]: {
          target: `.${NAVIGATION_STATES.HISTORY}`,
          context: {
            selection: null,
            note: '',
            saveDestination: CHECK_IN_SAVE_DESTINATIONS.BELIEF_SYSTEM,
            beliefSystemId: null,
            saved: null,
            editing: null,
            error: null,
            dataArchive: null,
            dataSafetyError: null,
            dataSafetyNotice: null,
          },
        },
        [NAVIGATION_EVENTS.ANALYTICS_OPENED]: {
          target: `.${NAVIGATION_STATES.ANALYTICS}`,
          context: {
            selection: null,
            note: '',
            occurredAtDraft: null,
            occurredAtCustomized: false,
            momentTimeEditorOpen: false,
            momentTimeEditorDraft: null,
            momentTimeEditorCustomized: false,
            momentTimePickerMode: null,
            beliefSystemId: null,
            saved: null,
            editing: null,
            error: null,
            dataArchive: null,
            dataSafetyError: null,
            dataSafetyNotice: null,
          },
        },
        [NAVIGATION_EVENTS.SETTINGS_OPENED]: {
          target: `.${NAVIGATION_STATES.SETTINGS}`,
          context: {
            selection: null,
            note: '',
            beliefSystemId: null,
            saved: null,
            editing: null,
            error: null,
            dataArchive: null,
            dataSafetyError: null,
            dataSafetyNotice: null,
          },
        },
        [CHECK_IN_EVENTS.EDIT_REQUESTED]: ({ event }) => ({
          target: `#appNavigation.${NAVIGATION_STATES.REFLECTION}`,
          context: {
            selection: selectionForCheckIn(event.entry),
            note: event.entry.note,
            occurredAtDraft: event.entry.occurredAt,
            occurredAtCustomized: true,
            momentTimeEditorOpen: false,
            momentTimeEditorDraft: null,
            momentTimeEditorCustomized: false,
            momentTimePickerMode: null,
            beliefSystemId: event.entry.beliefSystemId ?? null,
            saved: null,
            editing: event.entry,
            error: null,
          },
        }),
      },
      states: {
        [NAVIGATION_STATES.TODAY]: {
          initial: CHECK_IN_STATES.IDLE,
          states: {
            [CHECK_IN_STATES.IDLE]: {
              on: {
                [CHECK_IN_EVENTS.TOUCH_STARTED]: { target: CHECK_IN_STATES.EXPLORING },
                [CHECK_IN_EVENTS.SELECTION_CHANGED]: ({ context, event }, enq) => {
                  if (event.selection && event.selection.level !== context.selection?.level) {
                    enq(() => { void Haptics.selectionAsync(); });
                  }
                  return { context: { selection: event.selection } };
                },
              },
            },
            [CHECK_IN_STATES.EXPLORING]: {
              on: {
                [CHECK_IN_EVENTS.SELECTION_CHANGED]: ({ context, event }, enq) => {
                  if (event.selection && event.selection.level !== context.selection?.level) {
                    enq(() => { void Haptics.selectionAsync(); });
                  }
                  return { context: { selection: event.selection } };
                },
                [CHECK_IN_EVENTS.SELECTION_CANCELLED]: {
                  target: CHECK_IN_STATES.IDLE,
                  context: ({ context }) => ({
                    selection: context.editing ? selectionForCheckIn(context.editing) : null,
                  }),
                },
                [CHECK_IN_EVENTS.SELECTION_RELEASED]: ({ context }) => ({
                  target: context.selection
                    ? `#appNavigation.${NAVIGATION_STATES.REFLECTION}`
                    : CHECK_IN_STATES.IDLE,
                  context: context.selection && !context.editing
                    ? {
                        occurredAtDraft: checkInTimestampFromDate(new Date()),
                        occurredAtCustomized: false,
                        momentTimeEditorOpen: false,
                        momentTimeEditorDraft: null,
                        momentTimeEditorCustomized: false,
                        momentTimePickerMode: null,
                      }
                    : {
                        momentTimeEditorOpen: false,
                        momentTimeEditorDraft: null,
                        momentTimeEditorCustomized: false,
                        momentTimePickerMode: null,
                      },
                }),
              },
            },
          },
        },
        [NAVIGATION_STATES.HISTORY]: {},
        [NAVIGATION_STATES.ANALYTICS]: {},
        [NAVIGATION_STATES.SETTINGS]: {
          initial: DATA_SAFETY_STATES.IDLE,
          on: {
            [ONBOARDING_EVENTS.OPENED]: {
              target: `#appNavigation.${NAVIGATION_STATES.ONBOARDING}.${ONBOARDING_STATES.WELCOME}`,
              context: {
                onboardingEntryPoint: ONBOARDING_ENTRY_POINTS.SETTINGS,
                onboardingSelection: null,
                dataArchive: null,
                dataSafetyError: null,
                dataSafetyNotice: null,
                error: null,
              },
            },
            [BELIEF_LIBRARY_EVENTS.OPENED]: {
              target: `#appNavigation.${BELIEF_LIBRARY_STATES.LIBRARY}`,
              context: {
                beliefLibraryStatementId: null,
                beliefLibraryHarmfulDraft: '',
                beliefLibraryGuidingDraft: '',
                guidingHelpVisible: false,
                dataArchive: null,
                dataSafetyError: null,
                dataSafetyNotice: null,
                error: null,
              },
            },
            [REMINDER_EVENTS.OPENED]: ({ self }, enq) => {
              enq(() => {
                void Effect.runPromise(loadReminderData).then(
                  (assignments) => self.send({
                    type: REMINDER_EVENTS.HYDRATED,
                    assignments,
                  }),
                  () => self.send({
                    type: REMINDER_EVENTS.HYDRATION_FAILED,
                    message: 'Your reminders could not be loaded.',
                  }),
                );
              });
              return {
                target: `#appNavigation.${REMINDER_STATES.SETTINGS}`,
                context: {
                  reminderTargetKind: REMINDER_TARGET_KINDS.PULSE,
                  reminderTargetBeliefSystemId: null,
                  reminderEntryPoint: REMINDER_ENTRY_POINTS.SETTINGS,
                  reminderError: null,
                },
              };
            },
          },
          states: {
            [DATA_SAFETY_STATES.IDLE]: {
              on: {
                [DATA_SAFETY_EVENTS.EXPORT_REQUESTED]: {
                  target: DATA_SAFETY_STATES.EXPORTING,
                  context: { dataSafetyError: null, dataSafetyNotice: null },
                },
                [DATA_SAFETY_EVENTS.RESTORE_REQUESTED]: {
                  target: DATA_SAFETY_STATES.PICKING_ARCHIVE,
                  context: {
                    dataArchive: null,
                    dataSafetyError: null,
                    dataSafetyNotice: null,
                  },
                },
                [DATA_SAFETY_EVENTS.DELETE_REQUESTED]: {
                  target: DATA_SAFETY_STATES.DELETE_CONFIRMATION,
                  context: { dataSafetyError: null, dataSafetyNotice: null },
                },
                [DATA_SAFETY_EVENTS.NOTICE_DISMISSED]: {
                  context: { dataSafetyError: null, dataSafetyNotice: null },
                },
              },
            },
            [DATA_SAFETY_STATES.EXPORTING]: {
              entry: ({ self }, enq) => {
                enq(() => {
                  void Effect.runPromise(exportDataArchive()).then(
                    () => self.send({ type: DATA_SAFETY_EVENTS.EXPORT_SUCCEEDED }),
                    () => self.send({
                      type: DATA_SAFETY_EVENTS.OPERATION_FAILED,
                      message: DATA_EXPORT_FAILURE_MESSAGE,
                    }),
                  );
                });
              },
              on: {
                [NAVIGATION_EVENTS.TODAY_OPENED]: {},
                [NAVIGATION_EVENTS.HISTORY_OPENED]: {},
                [NAVIGATION_EVENTS.ANALYTICS_OPENED]: {},
                [DATA_SAFETY_EVENTS.EXPORT_SUCCEEDED]: {
                  target: DATA_SAFETY_STATES.IDLE,
                  context: {
                    dataSafetyError: null,
                    dataSafetyNotice: 'Your backup is ready.',
                  },
                },
                [DATA_SAFETY_EVENTS.OPERATION_FAILED]: ({ event }) => ({
                  target: DATA_SAFETY_STATES.IDLE,
                  context: { dataSafetyError: event.message, dataSafetyNotice: null },
                }),
              },
            },
            [DATA_SAFETY_STATES.PICKING_ARCHIVE]: {
              entry: ({ self }, enq) => {
                enq(() => {
                  void Effect.runPromise(pickDataArchive()).then(
                    (archive) => self.send(archive
                      ? { type: DATA_SAFETY_EVENTS.ARCHIVE_PICKED, archive }
                      : { type: DATA_SAFETY_EVENTS.PICK_CANCELLED }),
                    () => self.send({
                      type: DATA_SAFETY_EVENTS.OPERATION_FAILED,
                      message: DATA_ARCHIVE_FAILURE_MESSAGE,
                    }),
                  );
                });
              },
              on: {
                [NAVIGATION_EVENTS.TODAY_OPENED]: {},
                [NAVIGATION_EVENTS.HISTORY_OPENED]: {},
                [NAVIGATION_EVENTS.ANALYTICS_OPENED]: {},
                [DATA_SAFETY_EVENTS.ARCHIVE_PICKED]: {
                  target: DATA_SAFETY_STATES.RESTORE_PREVIEW,
                  context: ({ event }) => ({ dataArchive: event.archive }),
                },
                [DATA_SAFETY_EVENTS.PICK_CANCELLED]: {
                  target: DATA_SAFETY_STATES.IDLE,
                },
                [DATA_SAFETY_EVENTS.OPERATION_FAILED]: ({ event }) => ({
                  target: DATA_SAFETY_STATES.IDLE,
                  context: { dataSafetyError: event.message, dataSafetyNotice: null },
                }),
              },
            },
            [DATA_SAFETY_STATES.RESTORE_PREVIEW]: {
              on: {
                [DATA_SAFETY_EVENTS.RESTORE_CONFIRMED]: {
                  target: DATA_SAFETY_STATES.RESTORING,
                },
                [DATA_SAFETY_EVENTS.RESTORE_CANCELLED]: {
                  target: DATA_SAFETY_STATES.IDLE,
                  context: { dataArchive: null },
                },
              },
            },
            [DATA_SAFETY_STATES.RESTORING]: {
              entry: ({ context, self }, enq) => {
                enq(() => {
                  const archive = context.dataArchive;
                  if (!archive) {
                    self.send({
                      type: DATA_SAFETY_EVENTS.OPERATION_FAILED,
                      message: DATA_RESTORE_FAILURE_MESSAGE,
                    });
                    return;
                  }
                  assert(archive.version > 0, 'Restore archive requires a supported version.');
                  assert(archive.exportedAt.length > 0, 'Restore archive requires an export timestamp.');
                  void Effect.runPromise(restoreDataArchive(archive)).then(
                    () => self.send({
                      type: DATA_SAFETY_EVENTS.RESTORE_SUCCEEDED,
                      archive,
                    }),
                    () => self.send({
                      type: DATA_SAFETY_EVENTS.OPERATION_FAILED,
                      message: DATA_RESTORE_FAILURE_MESSAGE,
                    }),
                  );
                });
              },
              on: {
                [NAVIGATION_EVENTS.TODAY_OPENED]: {},
                [NAVIGATION_EVENTS.HISTORY_OPENED]: {},
                [NAVIGATION_EVENTS.ANALYTICS_OPENED]: {},
                [DATA_SAFETY_EVENTS.RESTORE_SUCCEEDED]: ({ event }, enq) => {
                  enq(() => {
                    checkInHistoryStore.trigger.hydrated({ entries: event.archive.checkIns });
                    appSettingsStore.trigger.hydrated({ settings: event.archive.settings });
                  });
                  return {
                    target: DATA_SAFETY_STATES.IDLE,
                    context: {
                      beliefStatements: event.archive.beliefStatements,
                      dataArchive: null,
                      dataSafetyError: null,
                      dataSafetyNotice: 'Your backup replaced the data on this device.',
                    },
                  };
                },
                [DATA_SAFETY_EVENTS.OPERATION_FAILED]: ({ event }) => ({
                  target: DATA_SAFETY_STATES.IDLE,
                  context: {
                    dataArchive: null,
                    dataSafetyError: event.message,
                    dataSafetyNotice: null,
                  },
                }),
              },
            },
            [DATA_SAFETY_STATES.DELETE_CONFIRMATION]: {
              on: {
                [DATA_SAFETY_EVENTS.DELETE_CONFIRMED]: {
                  target: DATA_SAFETY_STATES.DELETING,
                },
                [DATA_SAFETY_EVENTS.DELETE_CANCELLED]: {
                  target: DATA_SAFETY_STATES.IDLE,
                },
              },
            },
            [DATA_SAFETY_STATES.DELETING]: {
              entry: ({ self }, enq) => {
                enq(() => {
                  void Effect.runPromise(deleteAllJournalData()).then(
                    () => self.send({ type: DATA_SAFETY_EVENTS.DELETE_SUCCEEDED }),
                    () => self.send({
                      type: DATA_SAFETY_EVENTS.OPERATION_FAILED,
                      message: DATA_DELETE_ALL_FAILURE_MESSAGE,
                    }),
                  );
                });
              },
              on: {
                [NAVIGATION_EVENTS.TODAY_OPENED]: {},
                [NAVIGATION_EVENTS.HISTORY_OPENED]: {},
                [NAVIGATION_EVENTS.ANALYTICS_OPENED]: {},
                [DATA_SAFETY_EVENTS.DELETE_SUCCEEDED]: (_args, enq) => {
                  enq(() => checkInHistoryStore.trigger.hydrated({ entries: [] }));
                  return {
                    target: DATA_SAFETY_STATES.IDLE,
                    context: {
                      beliefStatements: [],
                      dataSafetyError: null,
                      dataSafetyNotice: 'Your moments and personal beliefs were deleted.',
                    },
                  };
                },
                [DATA_SAFETY_EVENTS.OPERATION_FAILED]: ({ event }) => ({
                  target: DATA_SAFETY_STATES.IDLE,
                  context: { dataSafetyError: event.message, dataSafetyNotice: null },
                }),
              },
            },
          },
        },
      },
    },
    [BELIEF_LIBRARY_STATES.LIBRARY]: {
      on: {
        [NAVIGATION_EVENTS.BACK_REQUESTED]: {
          target: `#appNavigation.${NAVIGATION_STATES.TABS}.${NAVIGATION_STATES.SETTINGS}`,
          context: {
            beliefLibraryStatementId: null,
            beliefLibraryHarmfulDraft: '',
            beliefLibraryGuidingDraft: '',
            guidingHelpVisible: false,
            error: null,
          },
        },
        [BELIEF_LIBRARY_EVENTS.CLOSED]: {
          target: `#appNavigation.${NAVIGATION_STATES.TABS}.${NAVIGATION_STATES.SETTINGS}`,
          context: {
            beliefLibraryStatementId: null,
            beliefLibraryHarmfulDraft: '',
            beliefLibraryGuidingDraft: '',
            guidingHelpVisible: false,
            error: null,
          },
        },
        [BELIEF_LIBRARY_EVENTS.CREATE_REQUESTED]: {
          target: BELIEF_LIBRARY_STATES.EDITOR,
          context: {
            beliefLibraryStatementId: createCustomBeliefSystemId({
              timestamp: Date.now(),
              nonce: Math.random().toString(16).slice(2),
            }),
            beliefLibraryHarmfulDraft: '',
            beliefLibraryGuidingDraft: '',
            guidingHelpVisible: false,
            error: null,
          },
        },
        [BELIEF_LIBRARY_EVENTS.EDIT_REQUESTED]: ({ context, event }) => {
          const statement = beliefStatementForId({
            beliefSystemId: event.beliefSystemId,
            statements: context.beliefStatements,
          });
          return statement?.kind === 'custom' && statement.archivedAt === undefined
            ? {
                target: BELIEF_LIBRARY_STATES.EDITOR,
                context: beliefLibraryDrafts(statement),
              }
            : undefined;
        },
        [REMINDER_EVENTS.TARGET_SELECTED]: {
          target: REMINDER_STATES.CHECKING_PERMISSION,
          context: ({ event }) => ({
            reminderTargetKind: REMINDER_TARGET_KINDS.GUIDING_BELIEF,
            reminderTargetBeliefSystemId: event.beliefSystemId,
            reminderEntryPoint: REMINDER_ENTRY_POINTS.BELIEF_LIBRARY,
            reminderAssignmentDraftId: null,
            reminderNotificationContentDraft: REMINDER_NOTIFICATION_CONTENT.GENERAL,
            reminderWeekdaysDraft: [2, 3, 4, 5, 6],
            reminderTimesDraft: [{ hour: 9, minute: 0 }],
            reminderError: null,
          }),
        },
        [REMINDER_EVENTS.ASSIGNMENT_EDIT_REQUESTED]: ({ context, event }) => {
          assert(event.assignmentId.length > 0, 'Reminder edit requires an assignment identifier.');
          assert(Schema.is(ReminderAssignmentListSchema)(context.reminderAssignments), 'Reminder assignments must satisfy their domain schema.');
          const assignment = context.reminderAssignments.find(
            (candidate) => candidate.id === event.assignmentId,
          );
          if (!assignment || assignment.targetKind !== REMINDER_TARGET_KINDS.GUIDING_BELIEF) {
            return undefined;
          }
          return {
            target: REMINDER_STATES.EDITOR,
            context: {
              reminderAssignmentDraftId: assignment.id,
              reminderTargetKind: assignment.targetKind,
              reminderTargetBeliefSystemId: assignment.beliefSystemId,
              reminderNotificationContentDraft: assignment.notificationContent,
              reminderEntryPoint: REMINDER_ENTRY_POINTS.BELIEF_LIBRARY,
              reminderWeekdaysDraft: assignment.weekdays,
              reminderTimesDraft: assignment.times,
              reminderTimePickerIndex: null,
              reminderError: null,
            },
          };
        },
        [REMINDER_EVENTS.ASSIGNMENT_TOGGLED]: ({ context, event, self }, enq) => {
          const assignment = context.reminderAssignments.find(
            (candidate) => candidate.id === event.assignmentId,
          );
          if (assignment) enq(() => {
            void setReminderAssignmentEnabled({
              assignment,
              assignments: context.reminderAssignments,
              enabled: !assignment.enabled,
              locale: appSettingsStore.getSnapshot().context.locale,
              statements: context.beliefStatements,
            }).then(
              (assignments) => self.send({
                type: REMINDER_EVENTS.ASSIGNMENT_UPDATED,
                assignments,
              }),
              () => self.send({
                type: REMINDER_EVENTS.OPERATION_FAILED,
                message: 'This reminder could not be updated.',
              }),
            );
          });
        },
        [REMINDER_EVENTS.ASSIGNMENT_UPDATED]: {
          context: ({ event }) => ({
            reminderAssignments: event.assignments,
            reminderError: null,
          }),
        },
        [REMINDER_EVENTS.ASSIGNMENT_DELETE_REQUESTED]: ({ context, event, self }, enq) => {
          const assignment = context.reminderAssignments.find(
            (candidate) => candidate.id === event.assignmentId,
          );
          if (assignment) enq(() => {
            void deleteReminder({
              assignment,
              assignments: context.reminderAssignments,
              locale: appSettingsStore.getSnapshot().context.locale,
              statements: context.beliefStatements,
            }).then(
              (assignments) => self.send({
                type: REMINDER_EVENTS.ASSIGNMENT_DELETED,
                assignments,
              }),
              () => self.send({
                type: REMINDER_EVENTS.OPERATION_FAILED,
                message: 'This reminder could not be deleted.',
              }),
            );
          });
        },
        [REMINDER_EVENTS.ASSIGNMENT_DELETED]: {
          context: ({ event }) => ({
            reminderAssignments: event.assignments,
            reminderError: null,
          }),
        },
        [REMINDER_EVENTS.OPERATION_FAILED]: {
          context: ({ event }) => ({ reminderError: event.message }),
        },
        [BELIEF_LIBRARY_EVENTS.REMOVE_REQUESTED]: ({ context, event }) => {
          const statement = beliefStatementForId({
            beliefSystemId: event.beliefSystemId,
            statements: context.beliefStatements,
          });
          return statement?.kind === 'custom' && statement.archivedAt === undefined
            ? {
                target: BELIEF_LIBRARY_STATES.RETIRING,
                context: {
                  beliefLibraryStatementId: statement.beliefSystemId,
                  error: null,
                },
              }
            : undefined;
        },
      },
    },
    [BELIEF_LIBRARY_STATES.EDITOR]: {
      on: {
        [NAVIGATION_EVENTS.BACK_REQUESTED]: {
          target: BELIEF_LIBRARY_STATES.LIBRARY,
          context: {
            beliefLibraryStatementId: null,
            beliefLibraryHarmfulDraft: '',
            beliefLibraryGuidingDraft: '',
            guidingHelpVisible: false,
            error: null,
          },
        },
        [BELIEF_LIBRARY_EVENTS.CLOSED]: {
          target: `#appNavigation.${NAVIGATION_STATES.TABS}.${NAVIGATION_STATES.SETTINGS}`,
          context: {
            beliefLibraryStatementId: null,
            beliefLibraryHarmfulDraft: '',
            beliefLibraryGuidingDraft: '',
            guidingHelpVisible: false,
            error: null,
          },
        },
        [BELIEF_LIBRARY_EVENTS.EDIT_CANCELLED]: {
          target: BELIEF_LIBRARY_STATES.LIBRARY,
          context: {
            beliefLibraryStatementId: null,
            beliefLibraryHarmfulDraft: '',
            beliefLibraryGuidingDraft: '',
            guidingHelpVisible: false,
            error: null,
          },
        },
        [BELIEF_LIBRARY_EVENTS.HARMFUL_DRAFT_CHANGED]: {
          context: ({ event }) => ({ beliefLibraryHarmfulDraft: event.statement }),
        },
        [BELIEF_LIBRARY_EVENTS.GUIDING_DRAFT_CHANGED]: {
          context: ({ event }) => ({ beliefLibraryGuidingDraft: event.statement }),
        },
        [BELIEF_LIBRARY_EVENTS.GUIDING_HELP_TOGGLED]: {
          context: ({ context }) => ({
            guidingHelpVisible: !context.guidingHelpVisible,
          }),
        },
        [BELIEF_LIBRARY_EVENTS.SAVE_REQUESTED]: ({ context }) => (
          managedBeliefStatementFromDraft(context)
            ? { target: BELIEF_LIBRARY_STATES.SAVING }
            : undefined
        ),
      },
    },
    [BELIEF_LIBRARY_STATES.SAVING]: {
      entry: ({ context, self }, enq) => {
        enq(() => {
          const statement = managedBeliefStatementFromDraft(context);
          if (!statement) {
            self.send({
              type: BELIEF_LIBRARY_EVENTS.OPERATION_FAILED,
              message: BELIEF_STATEMENT_FAILURE_MESSAGE,
            });
            return;
          }
          assert(statement.kind === 'custom', 'Belief library can persist only custom statements.');
          assert(statement.harmfulStatement.length > 0, 'Persisted belief requires harmful text.');
          void Effect.runPromise(
            persistBeliefStatement(statement).pipe(Effect.as(statement)),
          ).then(
            (saved) => self.send({
              type: BELIEF_LIBRARY_EVENTS.STATEMENT_SAVED,
              statement: saved,
            }),
            () => self.send({
              type: BELIEF_LIBRARY_EVENTS.OPERATION_FAILED,
              message: BELIEF_STATEMENT_FAILURE_MESSAGE,
            }),
          );
        });
      },
      on: {
        [BELIEF_LIBRARY_EVENTS.STATEMENT_SAVED]: ({ context, event }, enq) => {
          assert(event.statement.kind === 'custom', 'Belief library saves custom statements only.');
          assert(Schema.is(CustomBeliefStatementSchema)(event.statement), 'Saved custom belief must satisfy its domain schema.');
          const beliefStatements = recordBeliefStatement({
            statement: event.statement,
            statements: context.beliefStatements,
          });
          enq(() => reconcileStoredReminders({
            assignments: context.reminderAssignments,
            statements: beliefStatements,
          }));
          return {
          target: event.statement.guidingStatement !== undefined
            && beliefStatementForId({
              beliefSystemId: event.statement.beliefSystemId,
              statements: context.beliefStatements,
            })?.guidingStatement === undefined
            ? `#appNavigation.${REMINDER_STATES.CHECKING_PERMISSION}`
            : BELIEF_LIBRARY_STATES.LIBRARY,
          context: {
            beliefStatements,
            beliefLibraryStatementId: event.statement.guidingStatement !== undefined
              ? event.statement.beliefSystemId
              : null,
            beliefLibraryHarmfulDraft: '',
            beliefLibraryGuidingDraft: '',
            guidingHelpVisible: false,
            error: null,
            reminderTargetKind: REMINDER_TARGET_KINDS.GUIDING_BELIEF,
            reminderTargetBeliefSystemId: event.statement.guidingStatement !== undefined
              ? event.statement.beliefSystemId
              : null,
            reminderEntryPoint: REMINDER_ENTRY_POINTS.BELIEF_LIBRARY,
            reminderError: null,
          },
        };
        },
        [BELIEF_LIBRARY_EVENTS.OPERATION_FAILED]: ({ event }) => ({
          target: BELIEF_LIBRARY_STATES.EDITOR,
          context: { error: event.message },
        }),
      },
    },
    [BELIEF_LIBRARY_STATES.RETIRING]: {
      entry: ({ context, self }, enq) => {
        enq(() => {
          if (!context.beliefLibraryStatementId) {
            self.send({
              type: BELIEF_LIBRARY_EVENTS.OPERATION_FAILED,
              message: BELIEF_STATEMENT_FAILURE_MESSAGE,
            });
            return;
          }
          const beliefSystemId = context.beliefLibraryStatementId;
          const statement = beliefStatementForId({
            beliefSystemId,
            statements: context.beliefStatements,
          });
          if (statement?.kind !== 'custom' || statement.archivedAt !== undefined) {
            self.send({
              type: BELIEF_LIBRARY_EVENTS.OPERATION_FAILED,
              message: BELIEF_STATEMENT_FAILURE_MESSAGE,
            });
            return;
          }
          assert(statement.beliefSystemId === beliefSystemId, 'Retirement must preserve the belief identifier.');
          assert(statement.archivedAt === undefined, 'An active belief cannot already be archived.');
          void Effect.runPromise(retireCustomBeliefStatement({
            statement,
            archivedAt: BeliefStatementArchiveTimestamp.make(new Date().toISOString()),
          })).then(
            (archivedStatement) => self.send({
              type: BELIEF_LIBRARY_EVENTS.STATEMENT_RETIRED,
              beliefSystemId,
              archivedStatement,
            }),
            () => self.send({
              type: BELIEF_LIBRARY_EVENTS.OPERATION_FAILED,
              message: BELIEF_STATEMENT_FAILURE_MESSAGE,
            }),
          );
        });
      },
      on: {
        [BELIEF_LIBRARY_EVENTS.STATEMENT_RETIRED]: ({ context, event }, enq) => {
          assert(event.beliefSystemId.length > 0, 'Retired belief requires an identifier.');
          assert(event.archivedStatement === null || event.archivedStatement.archivedAt !== undefined, 'Returned retired belief must be archived.');
          const beliefStatements = event.archivedStatement
              ? recordBeliefStatement({
                  statement: event.archivedStatement,
                  statements: context.beliefStatements,
                })
              : removeBeliefStatement({
                  beliefSystemId: event.beliefSystemId,
                  statements: context.beliefStatements,
                });
          enq(() => reconcileStoredReminders({
            assignments: context.reminderAssignments,
            statements: beliefStatements,
          }));
          return {
            target: BELIEF_LIBRARY_STATES.LIBRARY,
            context: {
            beliefStatements,
            beliefLibraryStatementId: null,
            error: null,
          },
        };
        },
        [BELIEF_LIBRARY_EVENTS.OPERATION_FAILED]: ({ event }) => ({
          target: BELIEF_LIBRARY_STATES.LIBRARY,
          context: {
            beliefLibraryStatementId: null,
            error: event.message,
          },
        }),
      },
    },
    [REMINDER_STATES.SETTINGS]: {
      on: {
        [NAVIGATION_EVENTS.BACK_REQUESTED]: {
          target: `#appNavigation.${NAVIGATION_STATES.TABS}.${NAVIGATION_STATES.SETTINGS}`,
        },
        [REMINDER_EVENTS.CREATE_REQUESTED]: {
          target: REMINDER_STATES.CHECKING_PERMISSION,
          context: {
            reminderTargetKind: REMINDER_TARGET_KINDS.PULSE,
            reminderTargetBeliefSystemId: null,
            reminderEntryPoint: REMINDER_ENTRY_POINTS.SETTINGS,
            reminderAssignmentDraftId: null,
            reminderNotificationContentDraft: REMINDER_NOTIFICATION_CONTENT.GENERAL,
            reminderWeekdaysDraft: [2, 3, 4, 5, 6],
            reminderTimesDraft: [{ hour: 9, minute: 0 }],
            reminderError: null,
          },
        },
        [REMINDER_EVENTS.RETRY_REQUESTED]: ({ self }, enq) => {
          enq(() => {
            assert(appSettingsStore.getSnapshot().context.hydrated, 'Reminder retry requires hydrated app settings.');
            assert(
              Object.values(APP_LOCALES).includes(appSettingsStore.getSnapshot().context.locale),
              'Reminder retry requires a supported locale.',
            );
            void Effect.runPromise(loadReminderData).then(
              (assignments) => self.send({
                type: REMINDER_EVENTS.HYDRATED,
                assignments,
              }),
              () => self.send({
                type: REMINDER_EVENTS.HYDRATION_FAILED,
                message: 'Your reminders could not be loaded.',
              }),
            );
          });
          return { context: { reminderError: null } };
        },
        [REMINDER_EVENTS.ASSIGNMENT_EDIT_REQUESTED]: ({ context, event }) => {
          assert(event.assignmentId.length > 0, 'Reminder edit requires an assignment identifier.');
          assert(Schema.is(ReminderAssignmentListSchema)(context.reminderAssignments), 'Reminder assignments must satisfy their domain schema.');
          const assignment = context.reminderAssignments.find(
            (candidate) => candidate.id === event.assignmentId,
          );
          if (!assignment) return undefined;
          return {
            target: REMINDER_STATES.EDITOR,
            context: {
              reminderAssignmentDraftId: assignment.id,
              reminderTargetKind: assignment.targetKind,
              reminderTargetBeliefSystemId: assignment.targetKind
                === REMINDER_TARGET_KINDS.GUIDING_BELIEF
                ? assignment.beliefSystemId
                : null,
              reminderNotificationContentDraft: assignment.targetKind
                === REMINDER_TARGET_KINDS.GUIDING_BELIEF
                ? assignment.notificationContent
                : REMINDER_NOTIFICATION_CONTENT.GENERAL,
              reminderEntryPoint: REMINDER_ENTRY_POINTS.SETTINGS,
              reminderWeekdaysDraft: assignment.weekdays,
              reminderTimesDraft: assignment.times,
              reminderTimePickerIndex: null,
              reminderError: null,
            },
          };
        },
        [REMINDER_EVENTS.ASSIGNMENT_TOGGLED]: ({ context, event, self }, enq) => {
          const assignment = context.reminderAssignments.find(
            (candidate) => candidate.id === event.assignmentId,
          );
          if (assignment) enq(() => {
            void setReminderAssignmentEnabled({
              assignment,
              assignments: context.reminderAssignments,
              enabled: !assignment.enabled,
              locale: appSettingsStore.getSnapshot().context.locale,
              statements: context.beliefStatements,
            }).then(
              (assignments) => self.send({
                type: REMINDER_EVENTS.ASSIGNMENT_UPDATED,
                assignments,
              }),
              () => self.send({
                type: REMINDER_EVENTS.OPERATION_FAILED,
                message: 'This reminder could not be updated.',
              }),
            );
          });
        },
        [REMINDER_EVENTS.ASSIGNMENT_UPDATED]: {
          context: ({ event }) => ({
            reminderAssignments: event.assignments,
            reminderError: null,
          }),
        },
        [REMINDER_EVENTS.ASSIGNMENT_DELETE_REQUESTED]: ({ context, event, self }, enq) => {
          const assignment = context.reminderAssignments.find(
            (candidate) => candidate.id === event.assignmentId,
          );
          if (assignment) enq(() => {
            void deleteReminder({
              assignment,
              assignments: context.reminderAssignments,
              locale: appSettingsStore.getSnapshot().context.locale,
              statements: context.beliefStatements,
            }).then(
              (assignments) => self.send({
                type: REMINDER_EVENTS.ASSIGNMENT_DELETED,
                assignments,
              }),
              () => self.send({
                type: REMINDER_EVENTS.OPERATION_FAILED,
                message: 'This reminder could not be deleted.',
              }),
            );
          });
        },
        [REMINDER_EVENTS.ASSIGNMENT_DELETED]: {
          context: ({ event }) => ({
            reminderAssignments: event.assignments,
            reminderError: null,
          }),
        },
        [REMINDER_EVENTS.OPERATION_FAILED]: {
          context: ({ event }) => ({ reminderError: event.message }),
        },
      },
    },
    [REMINDER_STATES.CHECKING_PERMISSION]: {
      entry: ({ self }, enq) => {
        enq(() => {
          void getReminderPermission().then(
            (permission) => self.send({
              type: REMINDER_EVENTS.PERMISSION_RESOLVED,
              permission,
            }),
            () => self.send({
              type: REMINDER_EVENTS.PERMISSION_FAILED,
              message: 'Notification permission could not be checked.',
            }),
          );
        });
      },
      on: {
        [REMINDER_EVENTS.PERMISSION_RESOLVED]: ({ event }) => ({
          target: event.permission === REMINDER_PERMISSION_STATES.GRANTED
            ? REMINDER_STATES.EDITOR
            : event.permission === REMINDER_PERMISSION_STATES.UNDETERMINED
              ? REMINDER_STATES.OFFER
              : REMINDER_STATES.PERMISSION_DENIED,
          context: { reminderPermission: event.permission, reminderError: null },
        }),
        [REMINDER_EVENTS.PERMISSION_FAILED]: ({ event }) => ({
          target: REMINDER_STATES.PERMISSION_DENIED,
          context: { reminderError: event.message },
        }),
      },
    },
    [REMINDER_STATES.OFFER]: {
      on: {
        [NAVIGATION_EVENTS.BACK_REQUESTED]: ({ context }) => ({
          target: reminderOfferExitState(context.reminderEntryPoint),
        }),
        [REMINDER_EVENTS.OFFER_DECLINED]: ({ context }) => ({
          target: `#appNavigation.${reminderOfferExitState(context.reminderEntryPoint)}`,
          context: {
            reminderTargetBeliefSystemId: null,
            reminderError: null,
          },
        }),
        [REMINDER_EVENTS.OFFER_ACCEPTED]: {
          target: REMINDER_STATES.REQUESTING_PERMISSION,
        },
      },
    },
    [REMINDER_STATES.REQUESTING_PERMISSION]: {
      entry: ({ self }, enq) => {
        enq(() => {
          void requestReminderPermission().then(
            (permission) => self.send({
              type: REMINDER_EVENTS.PERMISSION_RESOLVED,
              permission,
            }),
            () => self.send({
              type: REMINDER_EVENTS.PERMISSION_FAILED,
              message: 'Notification permission could not be checked.',
            }),
          );
        });
      },
      on: {
        [REMINDER_EVENTS.PERMISSION_RESOLVED]: ({ event }) => ({
          target: event.permission === REMINDER_PERMISSION_STATES.GRANTED
            ? REMINDER_STATES.EDITOR
            : REMINDER_STATES.PERMISSION_DENIED,
          context: { reminderPermission: event.permission, reminderError: null },
        }),
        [REMINDER_EVENTS.PERMISSION_FAILED]: ({ event }) => ({
          target: REMINDER_STATES.PERMISSION_DENIED,
          context: { reminderError: event.message },
        }),
      },
    },
    [REMINDER_STATES.PERMISSION_DENIED]: {
      on: {
        [NAVIGATION_EVENTS.BACK_REQUESTED]: ({ context }) => ({
          target: reminderOfferExitState(context.reminderEntryPoint),
        }),
        [REMINDER_EVENTS.OFFER_DECLINED]: ({ context }) => ({
          target: `#appNavigation.${reminderOfferExitState(context.reminderEntryPoint)}`,
          context: { reminderTargetBeliefSystemId: null, reminderError: null },
        }),
        [REMINDER_EVENTS.SETTINGS_RETURNED]: {
          target: REMINDER_STATES.CHECKING_PERMISSION,
        },
        [REMINDER_EVENTS.SETTINGS_REQUESTED]: (_args, enq) => {
          enq(() => {
            void Linking.openSettings();
          });
        },
      },
    },
    [REMINDER_STATES.EDITOR]: {
      on: {
        [NAVIGATION_EVENTS.BACK_REQUESTED]: ({ context }) => ({
          target: reminderExitState(context.reminderEntryPoint),
        }),
        [REMINDER_EVENTS.CONTENT_CHANGED]: {
          context: ({ event }) => ({
            reminderNotificationContentDraft: event.notificationContent,
          }),
        },
        [REMINDER_EVENTS.WEEKDAY_TOGGLED]: {
          context: ({ context, event }) => ({
            reminderWeekdaysDraft: context.reminderWeekdaysDraft.includes(event.weekday)
              ? context.reminderWeekdaysDraft.filter((weekday) => weekday !== event.weekday)
              // oxlint-disable-next-line unicorn/no-array-sort -- Hermes lacks toSorted; this receiver is a fresh copy.
              : [...context.reminderWeekdaysDraft, event.weekday].sort(
                  (left, right) => left - right,
                ),
          }),
        },
        [REMINDER_EVENTS.TIME_SHIFTED]: {
          context: ({ context, event }) => ({
            reminderTimesDraft: context.reminderTimesDraft.map((time, index) => {
              assert(time.hour >= 0 && time.hour < 24, 'Reminder hour must be in the local-day range.');
              assert(time.minute >= 0 && time.minute < 60, 'Reminder minute must be in the hour range.');
              if (index !== event.index) return time;
              const dayMinutes = 24 * 60;
              const shifted = (time.hour * 60 + time.minute + event.minutes + dayMinutes)
                % dayMinutes;
              const candidate = { hour: Math.floor(shifted / 60), minute: shifted % 60 };
              return context.reminderTimesDraft.some((other, otherIndex) => (
                otherIndex !== index
                && other.hour === candidate.hour
                && other.minute === candidate.minute
              )) ? time : candidate;
            }),
          }),
        },
        [REMINDER_EVENTS.TIME_PICKER_REQUESTED]: {
          context: ({ context, event }) => ({
            reminderTimePickerIndex: event.index < context.reminderTimesDraft.length
              ? event.index
              : null,
          }),
        },
        [REMINDER_EVENTS.TIME_PICKER_DISMISSED]: {
          context: { reminderTimePickerIndex: null },
        },
        [REMINDER_EVENTS.TIME_CHANGED]: {
          context: ({ context, event }) => {
            assert(event.hour >= 0 && event.hour < 24, 'Changed reminder hour must be in range.');
            assert(event.minute >= 0 && event.minute < 60, 'Changed reminder minute must be in range.');
            const duplicate = context.reminderTimesDraft.some((time, index) => (
              index !== event.index
              && time.hour === event.hour
              && time.minute === event.minute
            ));
            return {
              reminderTimesDraft: duplicate
                ? context.reminderTimesDraft
                : context.reminderTimesDraft.map((time, index) => (
                    index === event.index
                      ? { hour: event.hour, minute: event.minute }
                      : time
                  )),
            };
          },
        },
        [REMINDER_EVENTS.TIME_ADDED]: {
          context: ({ context }) => {
            assert(context.reminderTimesDraft.length > 0, 'Reminder editor must retain at least one time.');
            assert(context.reminderTimesDraft.length <= MAX_REMINDER_TIMES, 'Reminder editor exceeded its time limit.');
            if (context.reminderTimesDraft.length >= MAX_REMINDER_TIMES) return {};
            const hour = [18, 12, 20, 15, 7].find((candidate) => (
              !context.reminderTimesDraft.some((time) => (
                time.hour === candidate && time.minute === 0
              ))
            ));
            return hour === undefined
              ? {}
              : { reminderTimesDraft: [...context.reminderTimesDraft, { hour, minute: 0 }] }
          },
        },
        [REMINDER_EVENTS.TIME_REMOVED]: {
          context: ({ context, event }) => ({
            reminderTimesDraft: context.reminderTimesDraft.length === 1
              ? context.reminderTimesDraft
              : context.reminderTimesDraft.filter((_time, index) => index !== event.index),
          }),
        },
        [REMINDER_EVENTS.SAVE_REQUESTED]: ({ context, self }, enq) => {
          const timing = reminderTimingFromDraft(context);
          if (!timing) return undefined;
          assert(timing.weekdays.length > 0, 'Saving a reminder requires weekdays.');
          assert(timing.times.length > 0, 'Saving a reminder requires times.');
          const assignment = context.reminderAssignmentDraftId
            ? context.reminderAssignments.find(
                (candidate) => candidate.id === context.reminderAssignmentDraftId,
              )
            : undefined;
          if (context.reminderAssignmentDraftId && !assignment) return undefined;
          if (assignment) {
            enq(() => {
              void updateReminder({
                assignment,
                assignments: context.reminderAssignments,
                locale: appSettingsStore.getSnapshot().context.locale,
                notificationContent: context.reminderNotificationContentDraft,
                statements: context.beliefStatements,
                timing,
              }).then(
                (assignments) => self.send({
                  type: REMINDER_EVENTS.SAVED,
                  assignment,
                  assignments,
                }),
                () => self.send({
                  type: REMINDER_EVENTS.OPERATION_FAILED,
                  message: 'Your reminder could not be updated.',
                }),
              );
            });
            return { target: REMINDER_STATES.SAVING, context: { reminderError: null } };
          }
          enq(() => activateReminderFromDraft({ context, timing, self }));
          return { target: REMINDER_STATES.SAVING, context: { reminderError: null } };
        },
      },
    },
    [REMINDER_STATES.SAVING]: {
      on: {
        [REMINDER_EVENTS.SAVED]: ({ context, event }) => ({
          target: context.reminderAssignmentDraftId
            ? reminderExitState(context.reminderEntryPoint)
            : REMINDER_STATES.ACTIVE,
          context: {
            reminderAssignments: event.assignments,
            reminderAssignmentDraftId: context.reminderAssignmentDraftId
              ? null
              : event.assignment.id,
            reminderError: null,
          },
        }),
        [REMINDER_EVENTS.OPERATION_FAILED]: ({ event }) => ({
          target: REMINDER_STATES.EDITOR,
          context: { reminderError: event.message },
        }),
      },
    },
    [REMINDER_STATES.ACTIVE]: {
      on: {
        [NAVIGATION_EVENTS.BACK_REQUESTED]: ({ context }) => ({
          target: `#appNavigation.${reminderExitState(context.reminderEntryPoint)}`,
        }),
        [REMINDER_EVENTS.DONE]: ({ context }) => ({
          target: `#appNavigation.${reminderExitState(context.reminderEntryPoint)}`,
        }),
        [REMINDER_EVENTS.TEST_REQUESTED]: ({ context }, enq) => {
          const assignment = context.reminderAssignments.find((candidate) => (
            candidate.targetKind === context.reminderTargetKind
            && (
              candidate.targetKind === REMINDER_TARGET_KINDS.PULSE
              || candidate.beliefSystemId === context.reminderTargetBeliefSystemId
            )
          ));
          if (!assignment) return;
          assert(assignment.enabled, 'Only an enabled reminder can send a test.');
          assert(assignment.times.length > 0, 'A test reminder requires a scheduled time.');
          enq(() => {
            void sendTestReminder({
              assignment,
              locale: appSettingsStore.getSnapshot().context.locale,
              statements: context.beliefStatements,
            });
          });
        },
      },
    },
    [REMINDER_STATES.GUIDING_BELIEF]: {
      on: {
        [NAVIGATION_EVENTS.BACK_REQUESTED]: {
          target: `#appNavigation.${NAVIGATION_STATES.TABS}.${NAVIGATION_STATES.TODAY}`,
        },
        [REMINDER_EVENTS.OPEN_PULSE_REQUESTED]: {
          target: `#appNavigation.${NAVIGATION_STATES.TABS}.${NAVIGATION_STATES.TODAY}`,
        },
        [REMINDER_EVENTS.EDIT_REQUESTED]: ({ context }) => {
          const assignment = context.reminderAssignments.find(
            (candidate) => candidate.id === context.reminderAssignmentDraftId,
          );
          if (!assignment) return undefined;
          assert(assignment.id === context.reminderAssignmentDraftId, 'Edited reminder must match the active draft.');
          assert(assignment.times.length > 0, 'Edited reminder requires at least one time.');
          return {
            target: REMINDER_STATES.EDITOR,
            context: {
              reminderNotificationContentDraft: assignment.targetKind
                === REMINDER_TARGET_KINDS.GUIDING_BELIEF
                ? assignment.notificationContent
                : REMINDER_NOTIFICATION_CONTENT.GENERAL,
              reminderWeekdaysDraft: assignment.weekdays,
              reminderTimesDraft: assignment.times,
              reminderTimePickerIndex: null,
              reminderError: null,
            },
          };
        },
      },
    },
    [NAVIGATION_STATES.REFLECTION]: {
      on: {
        [NAVIGATION_EVENTS.BACK_REQUESTED]: ({ context }) => ({
          target: context.editing
            ? `#appNavigation.${NAVIGATION_STATES.TABS}.${NAVIGATION_STATES.HISTORY}`
            : `#appNavigation.${NAVIGATION_STATES.TABS}.${NAVIGATION_STATES.TODAY}.${CHECK_IN_STATES.IDLE}`,
          context: {
            selection: null,
            note: '',
            occurredAtDraft: null,
            occurredAtCustomized: false,
            momentTimeEditorOpen: false,
            momentTimeEditorDraft: null,
            momentTimeEditorCustomized: false,
            momentTimePickerMode: null,
            beliefSystemId: null,
            saved: null,
            editing: null,
            error: null,
          },
        }),
        [CHECK_IN_EVENTS.NOTE_CHANGED]: {
          context: ({ event }) => ({ note: event.note.slice(0, MAX_NOTE_LENGTH) }),
        },
        [CHECK_IN_EVENTS.MOMENT_TIME_EDITOR_OPENED]: {
          context: ({ context }) => ({
            momentTimeEditorOpen: true,
            momentTimeEditorDraft: context.occurredAtDraft,
            momentTimeEditorCustomized: context.occurredAtCustomized,
          }),
        },
        [CHECK_IN_EVENTS.MOMENT_TIME_EDITOR_CLOSED]: {
          context: {
            momentTimeEditorOpen: false,
            momentTimeEditorDraft: null,
            momentTimeEditorCustomized: false,
            momentTimePickerMode: null,
          },
        },
        [CHECK_IN_EVENTS.MOMENT_TIME_EDITOR_CONFIRMED]: ({ context }) => (
          context.momentTimeEditorDraft
            ? {
                context: {
                  occurredAtDraft: context.momentTimeEditorDraft,
                  occurredAtCustomized: context.momentTimeEditorCustomized,
                  momentTimeEditorOpen: false,
                  momentTimeEditorDraft: null,
                  momentTimeEditorCustomized: false,
                  momentTimePickerMode: null,
                },
              }
            : undefined
        ),
        [CHECK_IN_EVENTS.MOMENT_TIME_DATE_REQUESTED]: {
          context: { momentTimePickerMode: MOMENT_TIME_PICKER_MODES.DATE },
        },
        [CHECK_IN_EVENTS.MOMENT_TIME_TIME_REQUESTED]: {
          context: { momentTimePickerMode: MOMENT_TIME_PICKER_MODES.TIME },
        },
        [CHECK_IN_EVENTS.MOMENT_TIME_PICKER_DISMISSED]: {
          context: { momentTimePickerMode: null },
        },
        [CHECK_IN_EVENTS.MOMENT_TIME_CHANGED]: ({ event }) => (
          event.occurredAt <= checkInTimestampFromDate(new Date())
            ? {
                context: {
                  momentTimeEditorDraft: event.occurredAt,
                  momentTimeEditorCustomized: true,
                },
              }
            : undefined
        ),
        [CHECK_IN_EVENTS.MOMENT_TIME_RESET]: {
          context: () => ({
            momentTimeEditorDraft: checkInTimestampFromDate(new Date()),
            momentTimeEditorCustomized: false,
            momentTimePickerMode: null,
          }),
        },
        [CHECK_IN_EVENTS.EDIT_SELECTION_REQUESTED]: {
          target: `#appNavigation.${NAVIGATION_STATES.TABS}.${NAVIGATION_STATES.TODAY}.${CHECK_IN_STATES.IDLE}`,
        },
        [CHECK_IN_EVENTS.REFLECTION_CANCELLED]: ({ context }) => ({
          target: context.editing
            ? `#appNavigation.${NAVIGATION_STATES.TABS}.${NAVIGATION_STATES.HISTORY}`
            : `#appNavigation.${NAVIGATION_STATES.TABS}.${NAVIGATION_STATES.TODAY}.${CHECK_IN_STATES.IDLE}`,
          context: {
            selection: null,
            note: '',
            occurredAtDraft: null,
            occurredAtCustomized: false,
            momentTimeEditorOpen: false,
            momentTimeEditorDraft: null,
            momentTimeEditorCustomized: false,
            momentTimePickerMode: null,
            beliefSystemId: null,
            saved: null,
            editing: null,
            error: null,
          },
        }),
        [CHECK_IN_EVENTS.CONFIRMED]: ({ context }) => (
          context.selection
            ? {
                target: CHECK_IN_STATES.SAVING,
                context: { saveDestination: CHECK_IN_SAVE_DESTINATIONS.BELIEF_SYSTEM },
              }
            : undefined
        ),
        [CHECK_IN_EVENTS.SAVE_FOR_NOW_REQUESTED]: ({ context }) => (
          context.selection
            ? {
                target: CHECK_IN_STATES.SAVING,
                context: { saveDestination: CHECK_IN_SAVE_DESTINATIONS.COMPLETE },
              }
            : undefined
        ),
      },
    },
    [CHECK_IN_STATES.SAVING]: {
      entry: ({ context, self }, enq) => {
        enq(() => {
          if (!context.selection || !context.occurredAtDraft) {
            self.send({ type: CHECK_IN_EVENTS.FAILED, message: CHECK_IN_FAILURE_MESSAGE });
            return;
          }
          void Effect.runPromise(persistCheckIn({
            selection: context.selection,
            note: context.note,
            occurredAt: context.occurredAtDraft,
            beliefSystemId: context.saved
              ? context.saved.beliefSystemId ?? null
              : context.editing?.beliefSystemId ?? null,
            existing: context.saved ?? context.editing,
          })).then(
            (saved) => self.send({ type: CHECK_IN_EVENTS.PERSISTED, saved }),
            () => self.send({ type: CHECK_IN_EVENTS.FAILED, message: CHECK_IN_FAILURE_MESSAGE }),
          );
        });
      },
      on: {
        [CHECK_IN_EVENTS.PERSISTED]: ({ context, event }, enq) => {
          enq(() => checkInHistoryStore.trigger.recorded({ entry: event.saved }));
          return {
            target: context.saveDestination === CHECK_IN_SAVE_DESTINATIONS.COMPLETE
              ? CHECK_IN_STATES.SUCCESS
              : CHECK_IN_STATES.BELIEF_SYSTEM,
            context: { ...context, saved: event.saved, error: null },
          };
        },
        [CHECK_IN_EVENTS.FAILED]: ({ context, event }) => ({
          target: CHECK_IN_STATES.FAILURE,
          context: { ...context, error: event.message },
        }),
      },
    },
    [CHECK_IN_STATES.BELIEF_SYSTEM]: {
      on: {
        [NAVIGATION_EVENTS.BACK_REQUESTED]: {
          target: NAVIGATION_STATES.REFLECTION,
        },
        [CHECK_IN_EVENTS.BELIEF_SYSTEM_CHANGED]: {
          context: ({ event }) => ({ beliefSystemId: event.beliefSystemId }),
        },
        [CHECK_IN_EVENTS.BELIEF_SYSTEM_BACK_REQUESTED]: {
          target: NAVIGATION_STATES.REFLECTION,
        },
        [CHECK_IN_EVENTS.BELIEF_SYSTEM_CATALOG_REQUESTED]: {
          target: CHECK_IN_STATES.BELIEF_SYSTEM_CATALOG,
        },
        [CHECK_IN_EVENTS.CONFIRMED]: ({ context }) => {
          if (!context.saved) return undefined;
          assert(context.saved.id.length > 0, 'Confirmed check-in requires a saved identifier.');
          assert(context.note.length <= MAX_NOTE_LENGTH, 'Confirmed check-in note exceeds its limit.');
          if ((context.saved.beliefSystemId ?? null) !== context.beliefSystemId) {
            return { target: CHECK_IN_STATES.ATTACHING_BELIEF_SYSTEM };
          }
          if (context.beliefSystemId) {
            return {
              target: CHECK_IN_STATES.GUIDING_BELIEF,
              context: guidingBeliefDrafts({
                beliefSystemId: context.beliefSystemId,
                beliefStatements: context.beliefStatements,
              }),
            };
          }
          if (context.editing) {
            return {
              target: `#appNavigation.${NAVIGATION_STATES.TABS}.${NAVIGATION_STATES.HISTORY}`,
              context: {
                selection: null,
                note: '',
                beliefSystemId: null,
                saved: null,
                editing: null,
                error: null,
              },
            };
          }
          return { target: CHECK_IN_STATES.SUCCESS };
        },
      },
    },
    [CHECK_IN_STATES.BELIEF_SYSTEM_CATALOG]: {
      on: {
        [NAVIGATION_EVENTS.BACK_REQUESTED]: {
          target: CHECK_IN_STATES.BELIEF_SYSTEM,
        },
        [CHECK_IN_EVENTS.BELIEF_SYSTEM_CHANGED]: {
          target: CHECK_IN_STATES.BELIEF_SYSTEM,
          context: ({ event }) => ({ beliefSystemId: event.beliefSystemId }),
        },
        [CHECK_IN_EVENTS.BELIEF_SYSTEM_CATALOG_CLOSED]: {
          target: CHECK_IN_STATES.BELIEF_SYSTEM,
        },
        [CHECK_IN_EVENTS.CUSTOM_BELIEF_SYSTEM_REQUESTED]: () => ({
          target: CHECK_IN_STATES.BELIEF_SYSTEM_EDITOR,
          context: {
            beliefSystemId: null,
            beliefStatementDraft: '',
            beliefStatementDraftId: createCustomBeliefSystemId({
              timestamp: Date.now(),
              nonce: Math.random().toString(16).slice(2),
            }),
            guidingBeliefStatementDraft: '',
            error: null,
          },
        }),
      },
    },
    [CHECK_IN_STATES.BELIEF_SYSTEM_EDITOR]: {
      on: {
        [NAVIGATION_EVENTS.BACK_REQUESTED]: {
          target: CHECK_IN_STATES.BELIEF_SYSTEM,
          context: {
            beliefStatementDraft: '',
            beliefStatementDraftId: null,
            guidingBeliefStatementDraft: '',
            error: null,
          },
        },
        [CHECK_IN_EVENTS.BELIEF_SYSTEM_DRAFT_CHANGED]: {
          context: ({ event }) => ({ beliefStatementDraft: event.statement }),
        },
        [CHECK_IN_EVENTS.BELIEF_SYSTEM_EDITOR_CANCELLED]: {
          target: CHECK_IN_STATES.BELIEF_SYSTEM,
          context: {
            beliefStatementDraft: '',
            beliefStatementDraftId: null,
            guidingBeliefStatementDraft: '',
            error: null,
          },
        },
        [CHECK_IN_EVENTS.BELIEF_SYSTEM_EDITOR_CONFIRMED]: ({ context }) => {
          return context.beliefStatementDraft.trim().length > 0
            ? { target: CHECK_IN_STATES.PERSISTING_BELIEF_STATEMENT }
            : undefined;
        },
      },
    },
    [CHECK_IN_STATES.PERSISTING_BELIEF_STATEMENT]: {
      entry: ({ context, self }, enq) => {
        enq(() => {
          const statement = customBeliefStatementFromDraft(context);
          if (!statement) {
            self.send({
              type: CHECK_IN_EVENTS.BELIEF_STATEMENT_PERSISTENCE_FAILED,
              message: BELIEF_STATEMENT_FAILURE_MESSAGE,
            });
            return;
          }
          assert(statement.kind === 'custom', 'Belief editor persists custom statements only.');
          assert(statement.harmfulStatement.length > 0, 'Persisted belief requires harmful text.');
          void Effect.runPromise(persistBeliefStatement(statement)).then(
            (persisted) => self.send({
              type: CHECK_IN_EVENTS.BELIEF_STATEMENT_PERSISTED,
              statement: persisted,
            }),
            () => self.send({
              type: CHECK_IN_EVENTS.BELIEF_STATEMENT_PERSISTENCE_FAILED,
              message: BELIEF_STATEMENT_FAILURE_MESSAGE,
            }),
          );
        });
      },
      on: {
        [CHECK_IN_EVENTS.BELIEF_STATEMENT_PERSISTED]: ({ context, event }) => ({
          target: CHECK_IN_STATES.BELIEF_SYSTEM,
          context: {
            beliefSystemId: event.statement.beliefSystemId,
            beliefStatements: recordBeliefStatement({
              statement: event.statement,
              statements: context.beliefStatements,
            }),
            beliefStatementDraft: '',
            beliefStatementDraftId: null,
            guidingBeliefStatementDraft: '',
            error: null,
          },
        }),
        [CHECK_IN_EVENTS.BELIEF_STATEMENT_PERSISTENCE_FAILED]: ({ event }) => ({
          target: CHECK_IN_STATES.BELIEF_STATEMENT_FAILURE,
          context: { error: event.message },
        }),
      },
    },
    [CHECK_IN_STATES.BELIEF_STATEMENT_FAILURE]: {
      on: {
        [NAVIGATION_EVENTS.BACK_REQUESTED]: {
          target: CHECK_IN_STATES.BELIEF_SYSTEM,
          context: {
            beliefStatementDraft: '',
            beliefStatementDraftId: null,
            guidingBeliefStatementDraft: '',
            error: null,
          },
        },
        [CHECK_IN_EVENTS.RETRIED]: {
          target: CHECK_IN_STATES.PERSISTING_BELIEF_STATEMENT,
        },
        [CHECK_IN_EVENTS.BELIEF_SYSTEM_EDITOR_CANCELLED]: {
          target: CHECK_IN_STATES.BELIEF_SYSTEM,
          context: {
            beliefStatementDraft: '',
            beliefStatementDraftId: null,
            guidingBeliefStatementDraft: '',
            error: null,
          },
        },
      },
    },
    [CHECK_IN_STATES.ATTACHING_BELIEF_SYSTEM]: {
      entry: ({ context, self }, enq) => {
        enq(() => {
          if (!context.selection || !context.saved) {
            self.send({ type: CHECK_IN_EVENTS.FAILED, message: BELIEF_SYSTEM_FAILURE_MESSAGE });
            return;
          }
          void Effect.runPromise(persistCheckIn({
            selection: context.selection,
            note: context.note,
            occurredAt: context.saved?.occurredAt
              ?? context.editing?.occurredAt
              ?? checkInTimestampFromDate(new Date()),
            beliefSystemId: context.beliefSystemId,
            existing: context.saved,
          })).then(
            (saved) => self.send({ type: CHECK_IN_EVENTS.PERSISTED, saved }),
            () => self.send({
              type: CHECK_IN_EVENTS.FAILED,
              message: BELIEF_SYSTEM_FAILURE_MESSAGE,
            }),
          );
        });
      },
      on: {
        [CHECK_IN_EVENTS.PERSISTED]: ({ context, event }, enq) => {
          assert(event.saved.id.length > 0, 'Persisted check-in requires an identifier.');
          assert(Schema.is(CheckInSchema)(event.saved), 'Persisted check-in must satisfy its domain schema.');
          enq(() => checkInHistoryStore.trigger.recorded({ entry: event.saved }));
          if (event.saved.beliefSystemId) {
            return {
              target: CHECK_IN_STATES.GUIDING_BELIEF,
              context: {
                ...context,
                ...guidingBeliefDrafts({
                  beliefSystemId: event.saved.beliefSystemId,
                  beliefStatements: context.beliefStatements,
                }),
                saved: event.saved,
              },
            };
          }
          if (context.editing) {
            return {
              target: `#appNavigation.${NAVIGATION_STATES.TABS}.${NAVIGATION_STATES.HISTORY}`,
              context: {
                selection: null,
                note: '',
                beliefSystemId: null,
                saved: null,
                editing: null,
                error: null,
              },
            };
          }
          return {
            target: CHECK_IN_STATES.SUCCESS,
            context: { ...context, saved: event.saved, error: null },
          };
        },
        [CHECK_IN_EVENTS.FAILED]: ({ context, event }) => ({
          target: CHECK_IN_STATES.BELIEF_SYSTEM_FAILURE,
          context: { ...context, error: event.message },
        }),
      },
    },
    [CHECK_IN_STATES.BELIEF_SYSTEM_FAILURE]: {
      on: {
        [NAVIGATION_EVENTS.BACK_REQUESTED]: {
          target: CHECK_IN_STATES.BELIEF_SYSTEM,
        },
        [CHECK_IN_EVENTS.RETRIED]: { target: CHECK_IN_STATES.ATTACHING_BELIEF_SYSTEM },
        [CHECK_IN_EVENTS.BELIEF_SYSTEM_BACK_REQUESTED]: {
          target: CHECK_IN_STATES.BELIEF_SYSTEM,
        },
      },
    },
    [CHECK_IN_STATES.GUIDING_BELIEF]: {
      on: {
        [NAVIGATION_EVENTS.BACK_REQUESTED]: {
          target: CHECK_IN_STATES.BELIEF_SYSTEM,
          context: {
            beliefStatementDraft: '',
            beliefStatementDraftId: null,
            guidingBeliefStatementDraft: '',
            guidingHelpVisible: false,
            error: null,
          },
        },
        [CHECK_IN_EVENTS.BELIEF_SYSTEM_DRAFT_CHANGED]: {
          context: ({ event }) => ({ beliefStatementDraft: event.statement }),
        },
        [CHECK_IN_EVENTS.GUIDING_BELIEF_SYSTEM_DRAFT_CHANGED]: {
          context: ({ event }) => ({ guidingBeliefStatementDraft: event.statement }),
        },
        [CHECK_IN_EVENTS.GUIDING_BELIEF_HELP_TOGGLED]: {
          context: ({ context }) => ({
            guidingHelpVisible: !context.guidingHelpVisible,
          }),
        },
        [CHECK_IN_EVENTS.GUIDING_BELIEF_BACK_REQUESTED]: {
          target: CHECK_IN_STATES.BELIEF_SYSTEM,
          context: {
            beliefStatementDraft: '',
            beliefStatementDraftId: null,
            guidingBeliefStatementDraft: '',
            guidingHelpVisible: false,
            error: null,
          },
        },
        [CHECK_IN_EVENTS.GUIDING_BELIEF_SKIPPED]: ({ context }) => {
          if (context.editing) {
            return {
              target: `#appNavigation.${NAVIGATION_STATES.TABS}.${NAVIGATION_STATES.HISTORY}`,
              context: {
                selection: null,
                note: '',
                beliefSystemId: null,
                beliefStatementDraft: '',
                beliefStatementDraftId: null,
                guidingBeliefStatementDraft: '',
                guidingHelpVisible: false,
                saved: null,
                editing: null,
                error: null,
              },
            };
          }
          return {
            target: CHECK_IN_STATES.SUCCESS,
            context: {
              beliefStatementDraft: '',
              beliefStatementDraftId: null,
              guidingBeliefStatementDraft: '',
              guidingHelpVisible: false,
              error: null,
            },
          };
        },
        [CHECK_IN_EVENTS.GUIDING_BELIEF_CONFIRMED]: ({ context }) => {
          if (!context.beliefSystemId) return undefined;
          assert(context.beliefSystemId.length > 0, 'Guiding belief requires a belief identifier.');
          assert(context.note.length <= MAX_NOTE_LENGTH, 'Guiding belief check-in note exceeds its limit.');
          const existing = beliefStatementForId({
            beliefSystemId: context.beliefSystemId,
            statements: context.beliefStatements,
          });
          const guidingStatement = context.guidingBeliefStatementDraft.trim();
          const customReady = isCustomBeliefSystemId(context.beliefSystemId)
            && context.beliefStatementDraft.trim().length > 0;
          const builtInReady = !isCustomBeliefSystemId(context.beliefSystemId)
            && (guidingStatement.length > 0 || existing?.guidingStatement !== undefined);
          return customReady || builtInReady
            ? { target: CHECK_IN_STATES.PERSISTING_GUIDING_BELIEF }
            : undefined;
        },
      },
    },
    [CHECK_IN_STATES.PERSISTING_GUIDING_BELIEF]: {
      entry: ({ context, self }, enq) => {
        enq(() => {
          if (!context.beliefSystemId) {
            self.send({
              type: CHECK_IN_EVENTS.BELIEF_STATEMENT_PERSISTENCE_FAILED,
              message: BELIEF_STATEMENT_FAILURE_MESSAGE,
            });
            return;
          }
          const beliefSystemId = context.beliefSystemId;
          assert(beliefSystemId.length > 0, 'Persisting a guiding belief requires an identifier.');
          assert(context.note.length <= MAX_NOTE_LENGTH, 'Guiding belief check-in note exceeds its limit.');
          const statement = guidingBeliefStatementFromDraft(context);
          const existing = beliefStatementForId({
            beliefSystemId,
            statements: context.beliefStatements,
          });
          if (statement) {
            void Effect.runPromise(persistBeliefStatement(statement).pipe(
              Effect.flatMap((persisted) => {
                if (!context.saved || !persisted.guidingStatement) {
                  return Effect.succeed(persisted);
                }
                return persistGuidingStatementSnapshot({
                  checkIn: context.saved,
                  guidingStatement: persisted.guidingStatement,
                }).pipe(
                  Effect.tap((saved) => Effect.sync(() => {
                    checkInHistoryStore.trigger.recorded({ entry: saved });
                  })),
                  Effect.as(persisted),
                );
              }),
            )).then(
              (persisted) => self.send({
                type: CHECK_IN_EVENTS.BELIEF_STATEMENT_PERSISTED,
                statement: persisted,
              }),
              () => self.send({
                type: CHECK_IN_EVENTS.BELIEF_STATEMENT_PERSISTENCE_FAILED,
                message: BELIEF_STATEMENT_FAILURE_MESSAGE,
              }),
            );
            return;
          }
          if (existing?.kind === 'built-in') {
            void Effect.runPromise(deleteBeliefStatement(beliefSystemId)).then(
              () => self.send({
                type: CHECK_IN_EVENTS.BELIEF_STATEMENT_REMOVED,
                beliefSystemId,
              }),
              () => self.send({
                type: CHECK_IN_EVENTS.BELIEF_STATEMENT_PERSISTENCE_FAILED,
                message: BELIEF_STATEMENT_FAILURE_MESSAGE,
              }),
            );
            return;
          }
          self.send({
            type: CHECK_IN_EVENTS.BELIEF_STATEMENT_PERSISTENCE_FAILED,
            message: BELIEF_STATEMENT_FAILURE_MESSAGE,
          });
        });
      },
      on: {
        [CHECK_IN_EVENTS.BELIEF_STATEMENT_PERSISTED]: ({ context, event }) => {
          assert(event.statement.beliefSystemId.length > 0, 'Persisted belief requires an identifier.');
          assert(Schema.is(BeliefStatementSchema)(event.statement), 'Persisted belief must satisfy its domain schema.');
          const beliefStatements = recordBeliefStatement({
            statement: event.statement,
            statements: context.beliefStatements,
          });
          if (context.editing) {
            return {
              target: `#appNavigation.${NAVIGATION_STATES.TABS}.${NAVIGATION_STATES.HISTORY}`,
              context: {
                beliefStatements,
                selection: null,
                note: '',
                beliefSystemId: null,
                beliefStatementDraft: '',
                beliefStatementDraftId: null,
                guidingBeliefStatementDraft: '',
                guidingHelpVisible: false,
                saved: null,
                editing: null,
                error: null,
              },
            };
          }
          return {
            target: CHECK_IN_STATES.SUCCESS,
            context: {
              beliefStatements,
              beliefStatementDraft: '',
              beliefStatementDraftId: null,
              guidingBeliefStatementDraft: '',
              guidingHelpVisible: false,
              error: null,
            },
          };
        },
        [CHECK_IN_EVENTS.BELIEF_STATEMENT_REMOVED]: ({ context, event }) => {
          assert(event.beliefSystemId.length > 0, 'Removed belief requires an identifier.');
          assert(beliefStatementForId({ beliefSystemId: event.beliefSystemId, statements: context.beliefStatements }) !== undefined, 'Removed belief must exist in current context.');
          const beliefStatements = removeBeliefStatement({
            beliefSystemId: event.beliefSystemId,
            statements: context.beliefStatements,
          });
          if (context.editing) {
            return {
              target: `#appNavigation.${NAVIGATION_STATES.TABS}.${NAVIGATION_STATES.HISTORY}`,
              context: {
                beliefStatements,
                selection: null,
                note: '',
                beliefSystemId: null,
                beliefStatementDraft: '',
                beliefStatementDraftId: null,
                guidingBeliefStatementDraft: '',
                guidingHelpVisible: false,
                saved: null,
                editing: null,
                error: null,
              },
            };
          }
          return {
            target: CHECK_IN_STATES.SUCCESS,
            context: {
              beliefStatements,
              beliefStatementDraft: '',
              beliefStatementDraftId: null,
              guidingBeliefStatementDraft: '',
              guidingHelpVisible: false,
              error: null,
            },
          };
        },
        [CHECK_IN_EVENTS.BELIEF_STATEMENT_PERSISTENCE_FAILED]: ({ context, event }) => ({
          target: CHECK_IN_STATES.GUIDING_BELIEF_FAILURE,
          context: { ...context, error: event.message },
        }),
      },
    },
    [CHECK_IN_STATES.GUIDING_BELIEF_FAILURE]: {
      on: {
        [NAVIGATION_EVENTS.BACK_REQUESTED]: {
          target: CHECK_IN_STATES.BELIEF_SYSTEM,
          context: {
            beliefStatementDraft: '',
            beliefStatementDraftId: null,
            guidingBeliefStatementDraft: '',
            guidingHelpVisible: false,
            error: null,
          },
        },
        [CHECK_IN_EVENTS.RETRIED]: {
          target: CHECK_IN_STATES.PERSISTING_GUIDING_BELIEF,
        },
        [CHECK_IN_EVENTS.GUIDING_BELIEF_BACK_REQUESTED]: {
          target: CHECK_IN_STATES.BELIEF_SYSTEM,
          context: {
            beliefStatementDraft: '',
            beliefStatementDraftId: null,
            guidingBeliefStatementDraft: '',
            guidingHelpVisible: false,
            error: null,
          },
        },
      },
    },
    [CHECK_IN_STATES.SUCCESS]: {
      on: {
        [REMINDER_EVENTS.SUCCESS_OFFER_ACCEPTED]: ({ context }) => {
          assert(Schema.is(AppContextSchema)(context), 'Reminder offer requires valid app context.');
          assert(Schema.is(ReminderAssignmentListSchema)(context.reminderAssignments), 'Reminder offer assignments must satisfy their domain schema.');
          const beliefSystemId = successReminderBeliefSystemId({
            assignments: context.reminderAssignments,
            reminderDataHydrated: context.reminderDataHydrated,
            reminderError: context.reminderError,
            savedBeliefSystemId: context.saved?.beliefSystemId,
            statements: context.beliefStatements,
          });
          if (!beliefSystemId) return undefined;
          return {
            target: REMINDER_STATES.CHECKING_PERMISSION,
            context: {
              reminderEntryPoint: REMINDER_ENTRY_POINTS.CHECK_IN_SUCCESS,
              reminderTargetKind: REMINDER_TARGET_KINDS.GUIDING_BELIEF,
              reminderTargetBeliefSystemId: beliefSystemId,
              reminderAssignmentDraftId: null,
              reminderNotificationContentDraft: REMINDER_NOTIFICATION_CONTENT.GENERAL,
              reminderError: null,
            },
          };
        },
        [NAVIGATION_EVENTS.BACK_REQUESTED]: {
          target: `#appNavigation.${NAVIGATION_STATES.TABS}.${NAVIGATION_STATES.TODAY}.${CHECK_IN_STATES.IDLE}`,
          context: {
            selection: null,
            note: '',
            occurredAtDraft: null,
            occurredAtCustomized: false,
            momentTimeEditorOpen: false,
            momentTimeEditorDraft: null,
            momentTimeEditorCustomized: false,
            momentTimePickerMode: null,
            saveDestination: CHECK_IN_SAVE_DESTINATIONS.BELIEF_SYSTEM,
            beliefSystemId: null,
            saved: null,
            editing: null,
            error: null,
            reminderEntryPoint: REMINDER_ENTRY_POINTS.BELIEF_LIBRARY,
            reminderTargetBeliefSystemId: null,
          },
        },
        [CHECK_IN_EVENTS.RESTARTED]: {
          target: `#appNavigation.${NAVIGATION_STATES.TABS}.${NAVIGATION_STATES.TODAY}.${CHECK_IN_STATES.IDLE}`,
          context: {
            selection: null,
            note: '',
            occurredAtDraft: null,
            occurredAtCustomized: false,
            momentTimeEditorOpen: false,
            momentTimeEditorDraft: null,
            momentTimeEditorCustomized: false,
            momentTimePickerMode: null,
            saveDestination: CHECK_IN_SAVE_DESTINATIONS.BELIEF_SYSTEM,
            beliefSystemId: null,
            saved: null,
            editing: null,
            error: null,
            reminderEntryPoint: REMINDER_ENTRY_POINTS.BELIEF_LIBRARY,
            reminderTargetBeliefSystemId: null,
          },
        },
      },
    },
    [CHECK_IN_STATES.FAILURE]: {
      on: {
        [NAVIGATION_EVENTS.BACK_REQUESTED]: { target: NAVIGATION_STATES.REFLECTION },
        [CHECK_IN_EVENTS.RETRIED]: { target: CHECK_IN_STATES.SAVING },
        [CHECK_IN_EVENTS.REFLECTION_CANCELLED]: { target: NAVIGATION_STATES.REFLECTION },
      },
    },
  },
});

function primaryRouteForStateValue(value: StateValue) {
  assert(
    (typeof value === 'string' && value.length > 0)
      || (typeof value === 'object' && value !== null),
    'Primary routing requires a supported XState value shape.',
  );
  const route = [
    {
      matches: matchesState(
        { [NAVIGATION_STATES.ONBOARDING]: ONBOARDING_STATES.EXAMPLE },
        value,
      ),
      route: APP_ROUTES.ONBOARDING_EXAMPLE,
    },
    {
      matches: matchesState(
        { [NAVIGATION_STATES.ONBOARDING]: ONBOARDING_STATES.PULSE },
        value,
      ),
      route: APP_ROUTES.ONBOARDING_PULSE,
    },
    { matches: matchesState(NAVIGATION_STATES.ONBOARDING, value), route: APP_ROUTES.ONBOARDING },
    { matches: matchesState(CHECK_IN_STATES.SUCCESS, value), route: APP_ROUTES.SUCCESS },
  ].find(({ matches }) => matches)?.route ?? null;
  assert(
    route === null || new Set([
      APP_ROUTES.ONBOARDING_EXAMPLE,
      APP_ROUTES.ONBOARDING_PULSE,
      APP_ROUTES.ONBOARDING,
      APP_ROUTES.SUCCESS,
    ]).has(route),
    'Primary routing returned an unsupported route.',
  );
  return route;
}

function beliefLibraryRouteForStateValue(value: StateValue) {
  assert(
    (typeof value === 'string' && value.length > 0)
      || (typeof value === 'object' && value !== null),
    'Belief-library routing requires a supported XState value shape.',
  );
  const route = [
    {
      matches: matchesState(BELIEF_LIBRARY_STATES.EDITOR, value)
        || matchesState(BELIEF_LIBRARY_STATES.SAVING, value),
      route: APP_ROUTES.BELIEF_LIBRARY_EDITOR,
    },
    {
      matches: matchesState(BELIEF_LIBRARY_STATES.LIBRARY, value)
        || matchesState(BELIEF_LIBRARY_STATES.RETIRING, value),
      route: APP_ROUTES.BELIEF_LIBRARY,
    },
  ].find(({ matches }) => matches)?.route ?? null;
  assert(
    route === null || new Set([
      APP_ROUTES.BELIEF_LIBRARY_EDITOR,
      APP_ROUTES.BELIEF_LIBRARY,
    ]).has(route),
    'Belief-library routing returned an unsupported route.',
  );
  return route;
}

function reminderRouteForStateValue(value: StateValue) {
  assert(
    (typeof value === 'string' && value.length > 0)
      || (typeof value === 'object' && value !== null),
    'Reminder routing requires a supported XState value shape.',
  );
  const editorMatches = [
    REMINDER_STATES.CHECKING_PERMISSION,
    REMINDER_STATES.OFFER,
    REMINDER_STATES.REQUESTING_PERMISSION,
    REMINDER_STATES.PERMISSION_DENIED,
    REMINDER_STATES.EDITOR,
    REMINDER_STATES.SAVING,
    REMINDER_STATES.ACTIVE,
    REMINDER_STATES.GUIDING_BELIEF,
  ].some((state) => matchesState(state, value));
  const route = [
    { matches: matchesState(REMINDER_STATES.SETTINGS, value), route: APP_ROUTES.REMINDERS },
    { matches: editorMatches, route: APP_ROUTES.LEITSATZ_REMINDER },
  ].find(({ matches }) => matches)?.route ?? null;
  assert(
    route === null || new Set([APP_ROUTES.REMINDERS, APP_ROUTES.LEITSATZ_REMINDER]).has(route),
    'Reminder routing returned an unsupported route.',
  );
  return route;
}

function guidingBeliefRouteForStateValue(value: StateValue) {
  if (
    matchesState(CHECK_IN_STATES.GUIDING_BELIEF, value)
    || matchesState(CHECK_IN_STATES.PERSISTING_GUIDING_BELIEF, value)
    || matchesState(CHECK_IN_STATES.GUIDING_BELIEF_FAILURE, value)
  ) {
    return APP_ROUTES.GUIDING_BELIEF;
  }
  return null;
}

function beliefSystemRouteForStateValue(value: StateValue) {
  assert(
    (typeof value === 'string' && value.length > 0)
      || (typeof value === 'object' && value !== null),
    'Belief-system routing requires a supported XState value shape.',
  );
  const route = [
    {
      matches: matchesState(CHECK_IN_STATES.BELIEF_SYSTEM_CATALOG, value),
      route: APP_ROUTES.BELIEF_SYSTEM_CATALOG,
    },
    {
      matches: matchesState(CHECK_IN_STATES.BELIEF_SYSTEM_EDITOR, value)
        || matchesState(CHECK_IN_STATES.PERSISTING_BELIEF_STATEMENT, value)
        || matchesState(CHECK_IN_STATES.BELIEF_STATEMENT_FAILURE, value),
      route: APP_ROUTES.BELIEF_SYSTEM_EDITOR,
    },
    {
      matches: matchesState(CHECK_IN_STATES.BELIEF_SYSTEM, value)
        || matchesState(CHECK_IN_STATES.ATTACHING_BELIEF_SYSTEM, value)
        || matchesState(CHECK_IN_STATES.BELIEF_SYSTEM_FAILURE, value),
      route: APP_ROUTES.BELIEF_SYSTEM,
    },
  ].find(({ matches }) => matches)?.route ?? null;
  assert(
    route === null || new Set([
      APP_ROUTES.BELIEF_SYSTEM_CATALOG,
      APP_ROUTES.BELIEF_SYSTEM_EDITOR,
      APP_ROUTES.BELIEF_SYSTEM,
    ]).has(route),
    'Belief-system routing returned an unsupported route.',
  );
  return route;
}

function reflectionRouteForStateValue(value: StateValue) {
  if (
    matchesState(NAVIGATION_STATES.REFLECTION, value)
    || matchesState(CHECK_IN_STATES.SAVING, value)
    || matchesState(CHECK_IN_STATES.FAILURE, value)
  ) {
    return APP_ROUTES.REFLECTION;
  }
  return null;
}

export function routeForStateValue(value: StateValue) {
  assert(
    (typeof value === 'string' && value.length > 0)
      || (typeof value === 'object' && value !== null),
    'App routing requires a supported XState value shape.',
  );
  const primaryRoute = primaryRouteForStateValue(value);
  const beliefLibraryRoute = beliefLibraryRouteForStateValue(value);
  const reminderRoute = reminderRouteForStateValue(value);
  const guidingBeliefRoute = guidingBeliefRouteForStateValue(value);
  const beliefSystemRoute = beliefSystemRouteForStateValue(value);
  const reflectionRoute = reflectionRouteForStateValue(value);
  const tabRoute = [
    {
      matches: matchesState({ [NAVIGATION_STATES.TABS]: NAVIGATION_STATES.HISTORY }, value),
      route: APP_ROUTES.HISTORY,
    },
    {
      matches: matchesState({ [NAVIGATION_STATES.TABS]: NAVIGATION_STATES.ANALYTICS }, value),
      route: APP_ROUTES.ANALYTICS,
    },
    {
      matches: matchesState({ [NAVIGATION_STATES.TABS]: NAVIGATION_STATES.SETTINGS }, value),
      route: APP_ROUTES.SETTINGS,
    },
    {
      matches: matchesState(NAVIGATION_STATES.STARTING, value)
        || matchesState({ [NAVIGATION_STATES.TABS]: NAVIGATION_STATES.TODAY }, value),
      route: APP_ROUTES.TODAY,
    },
  ].find(({ matches }) => matches)?.route;
  const route = primaryRoute
    ?? beliefLibraryRoute
    ?? reminderRoute
    ?? guidingBeliefRoute
    ?? beliefSystemRoute
    ?? reflectionRoute
    ?? tabRoute;
  assert(route, `Unhandled app navigation state: ${JSON.stringify(value)}`);
  return route;
}
