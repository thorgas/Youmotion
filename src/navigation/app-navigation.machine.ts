import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as Haptics from 'expo-haptics';
import {
  matchesState,
  setup,
  type StateValue,
} from 'xstate';

import {
  APP_ROUTES,
  BELIEF_LIBRARY_EVENTS,
  BELIEF_LIBRARY_STATES,
  BELIEF_SYSTEM_FAILURE_MESSAGE,
  BELIEF_STATEMENT_FAILURE_MESSAGE,
  CHECK_IN_EVENTS,
  CHECK_IN_DELETE_FAILURE_MESSAGE,
  CHECK_IN_FAILURE_MESSAGE,
  CHECK_IN_STATES,
  MAX_NOTE_LENGTH,
  NAVIGATION_EVENTS,
  NAVIGATION_STATES,
  ONBOARDING_ENTRY_POINTS,
  ONBOARDING_EVENTS,
  ONBOARDING_STATES,
  SETTINGS_EVENTS,
  SETTINGS_FAILURE_MESSAGE,
} from '@/constants';
import {
  CheckInSchema,
  CheckInId,
  CheckInListSchema,
  EmotionSelectionSchema,
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

const AppContextSchema = Schema.Struct({
  selection: Schema.NullOr(EmotionSelectionSchema),
  onboardingSelection: OnboardingSelectionSchema,
  onboardingEntryPoint: Schema.NullOr(OnboardingEntryPointSchema),
  note: Schema.String,
  beliefSystemId: Schema.NullOr(BeliefSystemId),
  beliefStatements: BeliefStatementListSchema,
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
        [NAVIGATION_STATES.SETTINGS]: {},
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
    beliefSystemId: null,
    beliefStatements: [],
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
  },
  entry: ({ self }, enq) => {
    enq(() => {
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
    });
  },
  on: {
    [CHECK_IN_EVENTS.HISTORY_HYDRATED]: ({ event }, enq) => {
      enq(() => checkInHistoryStore.trigger.hydrated({ entries: event.entries }));
    },
    [CHECK_IN_EVENTS.HISTORY_HYDRATION_FAILED]: ({ event }, enq) => {
      enq(() => checkInHistoryStore.trigger.hydrationFailed({ message: event.message }));
    },
    [CHECK_IN_EVENTS.BELIEF_STATEMENTS_HYDRATED]: {
      context: ({ context, event }) => ({
        beliefStatements: event.statements.reduce(
          (statements, statement) => recordBeliefStatement({
            statement,
            statements,
          }),
          context.beliefStatements,
        ),
      }),
    },
    [CHECK_IN_EVENTS.BELIEF_STATEMENTS_HYDRATION_FAILED]: {
      context: ({ event }) => ({ error: event.message }),
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
          const firstLaunch = (
            context.onboardingEntryPoint === ONBOARDING_ENTRY_POINTS.FIRST_LAUNCH
          );
          if (firstLaunch) {
            enq(() => {
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
          const firstLaunch = (
            context.onboardingEntryPoint === ONBOARDING_ENTRY_POINTS.FIRST_LAUNCH
          );
          if (firstLaunch) {
            enq(() => {
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
                ? { target: ONBOARDING_STATES.EXAMPLE }
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
            beliefSystemId: null,
            saved: null,
            editing: null,
            error: null,
          },
        },
        [NAVIGATION_EVENTS.HISTORY_OPENED]: {
          target: `.${NAVIGATION_STATES.HISTORY}`,
          context: {
            selection: null,
            note: '',
            beliefSystemId: null,
            saved: null,
            editing: null,
            error: null,
          },
        },
        [NAVIGATION_EVENTS.ANALYTICS_OPENED]: {
          target: `.${NAVIGATION_STATES.ANALYTICS}`,
          context: {
            selection: null,
            note: '',
            beliefSystemId: null,
            saved: null,
            editing: null,
            error: null,
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
          },
        },
        [CHECK_IN_EVENTS.EDIT_REQUESTED]: ({ event }) => ({
          target: `#appNavigation.${NAVIGATION_STATES.REFLECTION}`,
          context: {
            selection: selectionForCheckIn(event.entry),
            note: event.entry.note,
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
                }),
              },
            },
          },
        },
        [NAVIGATION_STATES.HISTORY]: {},
        [NAVIGATION_STATES.ANALYTICS]: {},
        [NAVIGATION_STATES.SETTINGS]: {
          on: {
            [ONBOARDING_EVENTS.OPENED]: {
              target: `#appNavigation.${NAVIGATION_STATES.ONBOARDING}.${ONBOARDING_STATES.WELCOME}`,
              context: {
                onboardingEntryPoint: ONBOARDING_ENTRY_POINTS.SETTINGS,
                onboardingSelection: null,
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
                error: null,
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
        [BELIEF_LIBRARY_EVENTS.STATEMENT_SAVED]: ({ context, event }) => ({
          target: BELIEF_LIBRARY_STATES.LIBRARY,
          context: {
            beliefStatements: recordBeliefStatement({
              statement: event.statement,
              statements: context.beliefStatements,
            }),
            beliefLibraryStatementId: null,
            beliefLibraryHarmfulDraft: '',
            beliefLibraryGuidingDraft: '',
            guidingHelpVisible: false,
            error: null,
          },
        }),
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
        [BELIEF_LIBRARY_EVENTS.STATEMENT_RETIRED]: ({ context, event }) => ({
          target: BELIEF_LIBRARY_STATES.LIBRARY,
          context: {
            beliefStatements: event.archivedStatement
              ? recordBeliefStatement({
                  statement: event.archivedStatement,
                  statements: context.beliefStatements,
                })
              : removeBeliefStatement({
                  beliefSystemId: event.beliefSystemId,
                  statements: context.beliefStatements,
                }),
            beliefLibraryStatementId: null,
            error: null,
          },
        }),
        [BELIEF_LIBRARY_EVENTS.OPERATION_FAILED]: ({ event }) => ({
          target: BELIEF_LIBRARY_STATES.LIBRARY,
          context: {
            beliefLibraryStatementId: null,
            error: event.message,
          },
        }),
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
            beliefSystemId: null,
            saved: null,
            editing: null,
            error: null,
          },
        }),
        [CHECK_IN_EVENTS.NOTE_CHANGED]: {
          context: ({ event }) => ({ note: event.note.slice(0, MAX_NOTE_LENGTH) }),
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
            beliefSystemId: null,
            saved: null,
            editing: null,
            error: null,
          },
        }),
        [CHECK_IN_EVENTS.CONFIRMED]: ({ context }) => (
          context.selection ? { target: CHECK_IN_STATES.SAVING } : undefined
        ),
      },
    },
    [CHECK_IN_STATES.SAVING]: {
      entry: ({ context, self }, enq) => {
        enq(() => {
          if (!context.selection) {
            self.send({ type: CHECK_IN_EVENTS.FAILED, message: CHECK_IN_FAILURE_MESSAGE });
            return;
          }
          void Effect.runPromise(persistCheckIn({
            selection: context.selection,
            note: context.note,
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
            target: CHECK_IN_STATES.BELIEF_SYSTEM,
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
        [NAVIGATION_EVENTS.BACK_REQUESTED]: {
          target: `#appNavigation.${NAVIGATION_STATES.TABS}.${NAVIGATION_STATES.TODAY}.${CHECK_IN_STATES.IDLE}`,
          context: {
            selection: null,
            note: '',
            beliefSystemId: null,
            saved: null,
            editing: null,
            error: null,
          },
        },
        [CHECK_IN_EVENTS.RESTARTED]: {
          target: `#appNavigation.${NAVIGATION_STATES.TABS}.${NAVIGATION_STATES.TODAY}.${CHECK_IN_STATES.IDLE}`,
          context: {
            selection: null,
            note: '',
            beliefSystemId: null,
            saved: null,
            editing: null,
            error: null,
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
  if (matchesState(
    { [NAVIGATION_STATES.ONBOARDING]: ONBOARDING_STATES.EXAMPLE },
    value,
  )) {
    return APP_ROUTES.ONBOARDING_EXAMPLE;
  }
  if (matchesState(
    { [NAVIGATION_STATES.ONBOARDING]: ONBOARDING_STATES.PULSE },
    value,
  )) {
    return APP_ROUTES.ONBOARDING_PULSE;
  }
  if (matchesState(NAVIGATION_STATES.ONBOARDING, value)) {
    return APP_ROUTES.ONBOARDING;
  }
  if (matchesState(CHECK_IN_STATES.SUCCESS, value)) return APP_ROUTES.SUCCESS;
  return null;
}

function beliefLibraryRouteForStateValue(value: StateValue) {
  if (
    matchesState(BELIEF_LIBRARY_STATES.EDITOR, value)
    || matchesState(BELIEF_LIBRARY_STATES.SAVING, value)
  ) {
    return APP_ROUTES.BELIEF_LIBRARY_EDITOR;
  }
  if (
    matchesState(BELIEF_LIBRARY_STATES.LIBRARY, value)
    || matchesState(BELIEF_LIBRARY_STATES.RETIRING, value)
  ) {
    return APP_ROUTES.BELIEF_LIBRARY;
  }
  return null;
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
  if (matchesState(CHECK_IN_STATES.BELIEF_SYSTEM_CATALOG, value)) {
    return APP_ROUTES.BELIEF_SYSTEM_CATALOG;
  }
  if (
    matchesState(CHECK_IN_STATES.BELIEF_SYSTEM_EDITOR, value)
    || matchesState(CHECK_IN_STATES.PERSISTING_BELIEF_STATEMENT, value)
    || matchesState(CHECK_IN_STATES.BELIEF_STATEMENT_FAILURE, value)
  ) {
    return APP_ROUTES.BELIEF_SYSTEM_EDITOR;
  }
  if (
    matchesState(CHECK_IN_STATES.BELIEF_SYSTEM, value)
    || matchesState(CHECK_IN_STATES.ATTACHING_BELIEF_SYSTEM, value)
    || matchesState(CHECK_IN_STATES.BELIEF_SYSTEM_FAILURE, value)
  ) {
    return APP_ROUTES.BELIEF_SYSTEM;
  }
  return null;
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
  const primaryRoute = primaryRouteForStateValue(value);
  if (primaryRoute) return primaryRoute;
  const beliefLibraryRoute = beliefLibraryRouteForStateValue(value);
  if (beliefLibraryRoute) return beliefLibraryRoute;
  const guidingBeliefRoute = guidingBeliefRouteForStateValue(value);
  if (guidingBeliefRoute) return guidingBeliefRoute;
  const beliefSystemRoute = beliefSystemRouteForStateValue(value);
  if (beliefSystemRoute) return beliefSystemRoute;
  const reflectionRoute = reflectionRouteForStateValue(value);
  if (reflectionRoute) return reflectionRoute;
  if (matchesState({ [NAVIGATION_STATES.TABS]: NAVIGATION_STATES.HISTORY }, value)) return APP_ROUTES.HISTORY;
  if (matchesState({ [NAVIGATION_STATES.TABS]: NAVIGATION_STATES.ANALYTICS }, value)) return APP_ROUTES.ANALYTICS;
  if (matchesState({ [NAVIGATION_STATES.TABS]: NAVIGATION_STATES.SETTINGS }, value)) return APP_ROUTES.SETTINGS;
  return APP_ROUTES.TODAY;
}
