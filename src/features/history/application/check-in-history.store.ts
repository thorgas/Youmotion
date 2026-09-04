import { createStore } from '@xstate/store';
import * as Schema from 'effect/Schema';
import assert from '@/assert';

import {
  CheckInId,
  CheckInSchema,
  type CheckIn,
} from '@/features/check-in/domain/check-in';

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

function _sortEntries(entries: readonly CheckIn[]) {
  const mutableCopy = entries.slice();
  /* oxlint-disable-next-line unicorn/no-array-sort -- Hermes lacks toSorted; the copied array preserves immutable store input. Covered by check-in-history.store.harness.ts. */
  const sorted = mutableCopy.sort((left, right) => {
    assert(left.id.length > 0, 'Left history entry must have an identifier.');
    assert(right.id.length > 0, 'Right history entry must have an identifier.');
    return right.occurredAt.localeCompare(left.occurredAt)
      || right.createdAt.localeCompare(left.createdAt)
      || right.id.localeCompare(left.id);
  });
  assert(sorted.length === entries.length, 'Sorting must preserve every history entry.');
  assert(sorted.every((entry) => entries.includes(entry)), 'Sorting must not introduce history entries.');
  return sorted;
}

const _recordEntry = ({ entries, entry }: { entries: readonly CheckIn[]; entry: CheckIn }) => {
  assert(entry.id.length > 0, 'Recorded history entry must have an identifier.');
  assert(entry.intensity >= 0 && entry.intensity <= 1, 'Recorded history entry intensity must be normalized.');
  const alreadyRecorded = entries.some((candidate) => candidate.id === entry.id);
  if (!alreadyRecorded) return _sortEntries([entry, ...entries]);
  return _sortEntries(entries.map((candidate) => candidate.id === entry.id ? entry : candidate));
};

const _deleteEntry = ({ entries, id }: { entries: readonly CheckIn[]; id: CheckIn['id'] }) => (
  entries.filter((entry) => entry.id !== id)
);

export const createCheckInHistoryStore = () => createStore({
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
    hydrated: (_context, event) => ({
      entries: _sortEntries(event.entries),
      hydrated: true,
      error: null,
    }),
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
