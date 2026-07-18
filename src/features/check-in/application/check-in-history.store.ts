import { createStore } from '@xstate/store';
import * as Schema from 'effect/Schema';

import { MAX_CHECK_IN_HISTORY } from '@/constants';
import { CheckInId, CheckInSchema, type CheckIn } from '../domain/check-in';

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

const _recordEntry = ({ entries, entry }: { entries: readonly CheckIn[]; entry: CheckIn }) => {
  const alreadyRecorded = entries.some((candidate) => candidate.id === entry.id);
  if (!alreadyRecorded) return [entry, ...entries].slice(0, MAX_CHECK_IN_HISTORY);
  return entries.map((candidate) => candidate.id === entry.id ? entry : candidate);
};

const _deleteEntry = ({ entries, id }: { entries: readonly CheckIn[]; id: CheckIn['id'] }) => (
  entries.filter((entry) => entry.id !== id)
);

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
      deleted: Schema.standardSchemaV1(Schema.Struct({ id: CheckInId })),
      deletionFailed: Schema.standardSchemaV1(Schema.Struct({ message: Schema.String })),
    },
  },
  context: initialContext,
  on: {
    hydrated: (_context, event) => ({ entries: event.entries, hydrated: true, error: null }),
    hydrationFailed: (context, event) => ({ ...context, hydrated: true, error: event.message }),
    recorded: (context, event) => ({
      ...context,
      entries: _recordEntry({ entries: context.entries, entry: event.entry }),
      error: null,
    }),
    deleted: (context, event) => ({
      ...context,
      entries: _deleteEntry({ entries: context.entries, id: event.id }),
      error: null,
    }),
    deletionFailed: (context, event) => ({ ...context, error: event.message }),
  },
});
