import { createStore } from '@xstate/store';
import * as Schema from 'effect/Schema';

import { MAX_CHECK_IN_HISTORY } from '@/constants';
import { CheckInSchema, type CheckIn } from '../domain/check-in';

const emptyEntries: readonly CheckIn[] = [];
const initialContext = {
  entries: emptyEntries,
  hydrated: false,
  error: null,
} satisfies {
  entries: readonly CheckIn[];
  hydrated: boolean;
  error: string | null;
};

export const checkInHistoryStore = createStore({
  schemas: {
    context: Schema.standardSchemaV1(Schema.Struct({
      entries: Schema.Array(CheckInSchema),
      hydrated: Schema.Boolean,
      error: Schema.NullOr(Schema.String),
    })),
    events: {
      hydrated: Schema.standardSchemaV1(Schema.Struct({ entries: Schema.Array(CheckInSchema) })),
      hydrationFailed: Schema.standardSchemaV1(Schema.Struct({ message: Schema.String })),
      recorded: Schema.standardSchemaV1(Schema.Struct({ entry: CheckInSchema })),
    },
  },
  context: initialContext,
  on: {
    hydrated: (_context, event) => ({ entries: event.entries, hydrated: true, error: null }),
    hydrationFailed: (context, event) => ({ ...context, hydrated: true, error: event.message }),
    recorded: (context, event) => ({
      ...context,
      entries: [event.entry, ...context.entries].slice(0, MAX_CHECK_IN_HISTORY),
    }),
  },
});
