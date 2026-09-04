import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { SurrealRecordId } from 'react-native-surrealdb';
import assert from '@/assert';

import {
  REMINDER_ASSIGNMENT_TABLE,
  REMINDER_TARGET_KINDS,
} from '@/constants';
import { queryDatabase } from '@/infrastructure/database/surrealdb.database';
import {
  ReminderAssignmentListSchema,
  ReminderAssignmentSchema,
  PulseReminderAssignmentSchema,
  GuidingBeliefReminderAssignmentSchema,
  type ReminderAssignment,
  type ReminderAssignmentId,
} from '../domain/reminder-assignment';

const SurrealNoneSchema = Schema.Struct({ kind: Schema.Literal('none') });
const SurrealIntegerSchema = Schema.Union(Schema.Int, Schema.BigIntFromSelf);
const ReminderTimingDatabaseFields = {
  weekdays: Schema.NonEmptyArray(SurrealIntegerSchema),
  times: Schema.NonEmptyArray(Schema.Struct({
    hour: SurrealIntegerSchema,
    minute: SurrealIntegerSchema,
  })),
};
const PulseReminderAssignmentDatabaseSchema = Schema.Struct({
  ...PulseReminderAssignmentSchema.fields,
  ...ReminderTimingDatabaseFields,
  schemaVersion: SurrealIntegerSchema,
  beliefSystemId: Schema.optional(SurrealNoneSchema),
  notificationContent: Schema.optional(SurrealNoneSchema),
});
const GuidingBeliefReminderAssignmentDatabaseSchema = Schema.Struct({
  ...GuidingBeliefReminderAssignmentSchema.fields,
  ...ReminderTimingDatabaseFields,
  schemaVersion: SurrealIntegerSchema,
});
const ReminderAssignmentDatabaseListSchema = Schema.Array(Schema.Union(
  PulseReminderAssignmentDatabaseSchema,
  GuidingBeliefReminderAssignmentDatabaseSchema,
));

function reminderAssignmentFromDatabase(
  assignment: typeof ReminderAssignmentDatabaseListSchema.Type[number],
): object {
  assert(assignment.weekdays.length > 0, 'Stored reminder must include weekdays');
  assert(assignment.times.length > 0, 'Stored reminder must include times');
  const timing = {
    weekdays: assignment.weekdays.map(Number),
    times: assignment.times.map(({ hour, minute }) => ({
      hour: Number(hour),
      minute: Number(minute),
    })),
  };
  assert(timing.weekdays.every(Number.isInteger), 'Decoded reminder weekdays must be integers');
  assert(timing.times.every(({ hour, minute }) => Number.isInteger(hour) && Number.isInteger(minute)), 'Decoded reminder times must be integers');
  if (assignment.targetKind === REMINDER_TARGET_KINDS.GUIDING_BELIEF) {
    return {
      ...assignment,
      ...timing,
      schemaVersion: Number(assignment.schemaVersion),
    };
  }
  const {
    beliefSystemId: _beliefSystemId,
    notificationContent: _notificationContent,
    ...pulse
  } = assignment;
  return {
    ...pulse,
    ...timing,
    schemaVersion: Number(pulse.schemaVersion),
  };
}

export class ReminderStorageError extends Schema.TaggedError<ReminderStorageError>()(
  'ReminderStorageError',
  {
    operation: Schema.Literal('read', 'write', 'delete'),
    cause: Schema.Defect,
  },
) {}

export class ReminderDataError extends Schema.TaggedError<ReminderDataError>()(
  'ReminderDataError',
  {
    operation: Schema.Literal('decode', 'encode'),
    cause: Schema.Defect,
  },
) {}

function recordId({ table, id }: { table: string; id: string }) {
  return new SurrealRecordId(`${table}:${id}`);
}

function readTable(query: string) {
  return Effect.tryPromise({
    try: () => queryDatabase({ surql: query }),
    catch: (cause) => ReminderStorageError.make({ operation: 'read', cause }),
  });
}

export const loadReminderData = Effect.gen(function*() {
  const assignments = yield* readTable(
    'SELECT assignmentId AS id, schemaVersion, targetKind, beliefSystemId, enabled, weekdays, times, notificationContent, createdAt, updatedAt FROM reminder_assignment',
  );
  return assignments;
}).pipe(
  Effect.flatMap((assignments) => Schema.decodeUnknown(
    ReminderAssignmentDatabaseListSchema,
  )(assignments[0]?.value ?? []).pipe(
    Effect.flatMap((decoded) => Schema.decodeUnknown(ReminderAssignmentListSchema)(
      decoded.map(reminderAssignmentFromDatabase),
    )),
  )),
  Effect.mapError((cause) => (
    cause instanceof ReminderStorageError
      ? cause
      : ReminderDataError.make({ operation: 'decode', cause })
  )),
  Effect.withSpan('ReminderRepository.load'),
);

function persistRecord({
  encoded,
  id,
  table,
}: {
  encoded: object;
  id: string;
  table: string;
}) {
  return Effect.tryPromise({
    try: async () => {
      await queryDatabase({
        surql: 'UPSERT $record CONTENT $value',
        variables: {
          record: recordId({ table, id }),
          value: encoded,
        },
      });
    },
    catch: (cause) => ReminderStorageError.make({ operation: 'write', cause }),
  });
}

export const persistReminderAssignment = Effect.fn('ReminderRepository.persistAssignment')(
  (assignment: ReminderAssignment) => Schema.encode(ReminderAssignmentSchema)(assignment).pipe(
    Effect.mapError((cause) => ReminderDataError.make({ operation: 'encode', cause })),
    Effect.flatMap((encoded) => persistRecord({
    encoded: encoded.targetKind === 'pulse'
      ? {
          assignmentId: encoded.id,
          schemaVersion: encoded.schemaVersion,
          targetKind: encoded.targetKind,
          enabled: encoded.enabled,
          weekdays: encoded.weekdays,
          times: encoded.times,
          createdAt: encoded.createdAt,
          updatedAt: encoded.updatedAt,
        }
      : {
          assignmentId: encoded.id,
          schemaVersion: encoded.schemaVersion,
          targetKind: encoded.targetKind,
          beliefSystemId: encoded.beliefSystemId,
          enabled: encoded.enabled,
          weekdays: encoded.weekdays,
          times: encoded.times,
          notificationContent: encoded.notificationContent,
          createdAt: encoded.createdAt,
          updatedAt: encoded.updatedAt,
        },
    id: assignment.id,
    table: REMINDER_ASSIGNMENT_TABLE,
  }))),
);

function deleteRecord({ table, id }: { table: string; id: string }) {
  return Effect.tryPromise({
    try: () => queryDatabase({
      surql: 'DELETE $record',
      variables: { record: recordId({ table, id }) },
    }),
    catch: (cause) => ReminderStorageError.make({ operation: 'delete', cause }),
  });
}

export const deleteReminderAssignment = Effect.fn('ReminderRepository.deleteAssignment')(
  (id: ReminderAssignmentId) => deleteRecord({ table: REMINDER_ASSIGNMENT_TABLE, id }),
);
