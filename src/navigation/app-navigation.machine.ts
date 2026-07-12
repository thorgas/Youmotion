import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as Haptics from 'expo-haptics';
import {
  createAsyncLogic,
  matchesState,
  setup,
  type StateValue,
} from 'xstate';

import {
  APP_ROUTES,
  CHECK_IN_EVENTS,
  CHECK_IN_FAILURE_MESSAGE,
  CHECK_IN_STATES,
  MAX_NOTE_LENGTH,
  NAVIGATION_EVENTS,
  NAVIGATION_STATES,
} from '@/constants';
import {
  CheckInSchema,
  CheckInListSchema,
  EmotionSelectionSchema,
  PersistCheckInFailure,
  PersistCheckInInputSchema,
  PersistCheckInResultSchema,
  PersistCheckInSuccess,
} from '@/features/check-in/domain/check-in';
import { loadCheckIns, persistCheckIn } from '@/features/check-in/infrastructure/check-in.repository';
import { checkInHistoryStore } from '@/features/check-in/application/check-in-history.store';

const AppContextSchema = Schema.Struct({
  selection: Schema.NullOr(EmotionSelectionSchema),
  note: Schema.String,
  saved: Schema.NullOr(CheckInSchema),
  error: Schema.NullOr(Schema.String),
});

const EmptyEventSchema = Schema.standardSchemaV1(Schema.Struct({}));

const persistCheckInActor = createAsyncLogic({
  schemas: {
    input: Schema.standardSchemaV1(PersistCheckInInputSchema),
    output: Schema.standardSchemaV1(PersistCheckInResultSchema),
  },
  run: ({ input }) => Effect.runPromise(
    Effect.gen(function* () {
      if (!input.selection) return yield* Effect.dieMessage('Saving requires an emotion selection.');
      return yield* persistCheckIn({ selection: input.selection, note: input.note });
    }).pipe(
      Effect.match({
        onFailure: () => PersistCheckInFailure.make({ message: CHECK_IN_FAILURE_MESSAGE }),
        onSuccess: (saved) => PersistCheckInSuccess.make({ saved }),
      }),
    ),
  ),
});

const hydrateHistoryActor = createAsyncLogic({
  schemas: { output: Schema.standardSchemaV1(CheckInListSchema) },
  run: () => Effect.runPromise(loadCheckIns),
});

export const appNavigationMachine = setup({
  states: {
    [NAVIGATION_STATES.TABS]: {
      states: {
        [NAVIGATION_STATES.TODAY]: {
          states: {
            [CHECK_IN_STATES.IDLE]: {},
            [CHECK_IN_STATES.EXPLORING]: {},
          },
        },
        [NAVIGATION_STATES.HISTORY]: {},
        [NAVIGATION_STATES.SETTINGS]: {},
      },
    },
    [NAVIGATION_STATES.REFLECTION]: {},
    [CHECK_IN_STATES.SAVING]: {},
    [CHECK_IN_STATES.SUCCESS]: {},
    [CHECK_IN_STATES.FAILURE]: {},
  },
  schemas: {
    context: Schema.standardSchemaV1(AppContextSchema),
    events: {
      [NAVIGATION_EVENTS.TODAY_OPENED]: EmptyEventSchema,
      [NAVIGATION_EVENTS.HISTORY_OPENED]: EmptyEventSchema,
      [NAVIGATION_EVENTS.SETTINGS_OPENED]: EmptyEventSchema,
      [CHECK_IN_EVENTS.TOUCH_STARTED]: EmptyEventSchema,
      [CHECK_IN_EVENTS.SELECTION_CHANGED]: Schema.standardSchemaV1(
        Schema.Struct({ selection: Schema.NullOr(EmotionSelectionSchema) }),
      ),
      [CHECK_IN_EVENTS.SELECTION_RELEASED]: EmptyEventSchema,
      [CHECK_IN_EVENTS.NOTE_CHANGED]: Schema.standardSchemaV1(Schema.Struct({ note: Schema.String })),
      [CHECK_IN_EVENTS.CONFIRMED]: EmptyEventSchema,
      [CHECK_IN_EVENTS.RETRIED]: EmptyEventSchema,
      [CHECK_IN_EVENTS.RESTARTED]: EmptyEventSchema,
      [CHECK_IN_EVENTS.REFLECTION_CANCELLED]: EmptyEventSchema,
    },
  },
  actorSources: { persistCheckIn: persistCheckInActor, hydrateHistory: hydrateHistoryActor },
}).createMachine({
  id: 'appNavigation',
  initial: NAVIGATION_STATES.TABS,
  context: { selection: null, note: '', saved: null, error: null },
  invoke: {
    src: 'hydrateHistory',
    onDone: ({ event }, enq) => {
      enq(() => checkInHistoryStore.trigger.hydrated({ entries: event.output }));
    },
    onError: (_args, enq) => {
      enq(() => checkInHistoryStore.trigger.hydrationFailed({ message: CHECK_IN_FAILURE_MESSAGE }));
    },
  },
  states: {
    [NAVIGATION_STATES.TABS]: {
      initial: NAVIGATION_STATES.TODAY,
      on: {
        [NAVIGATION_EVENTS.TODAY_OPENED]: { target: `.${NAVIGATION_STATES.TODAY}` },
        [NAVIGATION_EVENTS.HISTORY_OPENED]: { target: `.${NAVIGATION_STATES.HISTORY}` },
        [NAVIGATION_EVENTS.SETTINGS_OPENED]: { target: `.${NAVIGATION_STATES.SETTINGS}` },
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
        [NAVIGATION_STATES.SETTINGS]: {},
      },
    },
    [NAVIGATION_STATES.REFLECTION]: {
      on: {
        [CHECK_IN_EVENTS.NOTE_CHANGED]: {
          context: ({ event }) => ({ note: event.note.slice(0, MAX_NOTE_LENGTH) }),
        },
        [CHECK_IN_EVENTS.REFLECTION_CANCELLED]: {
          target: `#appNavigation.${NAVIGATION_STATES.TABS}.${NAVIGATION_STATES.TODAY}.${CHECK_IN_STATES.IDLE}`,
          context: { selection: null, note: '', saved: null, error: null },
        },
        [CHECK_IN_EVENTS.CONFIRMED]: ({ context }) => (
          context.selection ? { target: CHECK_IN_STATES.SAVING } : undefined
        ),
      },
    },
    [CHECK_IN_STATES.SAVING]: {
      invoke: {
        src: 'persistCheckIn',
        input: ({ context }) => ({ selection: context.selection, note: context.note }),
        onDone: ({ context, event }, enq) => {
          if (event.output._tag === 'PersistCheckInSuccess') {
            const output = event.output;
            enq(() => checkInHistoryStore.trigger.recorded({ entry: output.saved }));
            return {
              target: CHECK_IN_STATES.SUCCESS,
              context: { ...context, saved: event.output.saved, error: null },
            };
          }
          return {
            target: CHECK_IN_STATES.FAILURE,
            context: { ...context, error: event.output.message },
          };
        },
        onError: {
          target: CHECK_IN_STATES.FAILURE,
          context: ({ context }) => ({ ...context, error: CHECK_IN_FAILURE_MESSAGE }),
        },
      },
    },
    [CHECK_IN_STATES.SUCCESS]: {
      on: {
        [CHECK_IN_EVENTS.RESTARTED]: {
          target: `#appNavigation.${NAVIGATION_STATES.TABS}.${NAVIGATION_STATES.TODAY}.${CHECK_IN_STATES.IDLE}`,
          context: { selection: null, note: '', saved: null, error: null },
        },
      },
    },
    [CHECK_IN_STATES.FAILURE]: {
      on: {
        [CHECK_IN_EVENTS.RETRIED]: { target: CHECK_IN_STATES.SAVING },
        [CHECK_IN_EVENTS.REFLECTION_CANCELLED]: { target: NAVIGATION_STATES.REFLECTION },
      },
    },
  },
});

export function routeForStateValue(value: StateValue) {
  if (matchesState(CHECK_IN_STATES.SUCCESS, value)) return APP_ROUTES.SUCCESS;
  if (
    matchesState(NAVIGATION_STATES.REFLECTION, value)
    || matchesState(CHECK_IN_STATES.SAVING, value)
    || matchesState(CHECK_IN_STATES.FAILURE, value)
  ) return APP_ROUTES.REFLECTION;
  if (matchesState({ [NAVIGATION_STATES.TABS]: NAVIGATION_STATES.HISTORY }, value)) return APP_ROUTES.HISTORY;
  if (matchesState({ [NAVIGATION_STATES.TABS]: NAVIGATION_STATES.SETTINGS }, value)) return APP_ROUTES.SETTINGS;
  return APP_ROUTES.TODAY;
}
