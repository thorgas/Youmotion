import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { SurrealRecordId } from 'react-native-surrealdb';

import {
  REMINDER_ASSIGNMENT_TABLE,
  REMINDER_SCHEDULE_TABLE,
  REMINDER_TARGET_KINDS,
} from '@/constants';
import { queryDatabase } from '@/features/check-in/infrastructure/surrealdb.database';
import {
  ReminderAssignmentListSchema,
  ReminderAssignmentSchema,
  PulseReminderAssignmentSchema,
  GuidingBeliefReminderAssignmentSchema,
  type ReminderAssignment,
  type ReminderAssignmentId,
} from '../domain/reminder-assignment';
import {
  ReminderScheduleListSchema,
  ReminderScheduleSchema,
  type ReminderSchedule,
  type ReminderScheduleId,
} from '../domain/reminder-schedule';

const SurrealNoneSchema = Schema.Struct({ kind: Schema.Literal('none') });
const SurrealIntegerSchema = Schema.Union(Schema.Int, Schema.BigIntFromSelf);
const ReminderScheduleDatabaseSchema = Schema.Struct({
  ...ReminderScheduleSchema.fields,
  schemaVersion: SurrealIntegerSchema,
  weekdays: Schema.NonEmptyArray(SurrealIntegerSchema),
  times: Schema.NonEmptyArray(Schema.Struct({
    hour: SurrealIntegerSchema,
    minute: SurrealIntegerSchema,
  })),
});
const ReminderScheduleDatabaseListSchema = Schema.Array(ReminderScheduleDatabaseSchema);
const PulseReminderAssignmentDatabaseSchema = Schema.Struct({
  ...PulseReminderAssignmentSchema.fields,
  schemaVersion: SurrealIntegerSchema,
  beliefSystemId: Schema.optional(SurrealNoneSchema),
  showFullText: Schema.optional(SurrealNoneSchema),
});
const GuidingBeliefReminderAssignmentDatabaseSchema = Schema.Struct({
  ...GuidingBeliefReminderAssignmentSchema.fields,
  schemaVersion: SurrealIntegerSchema,
});
const ReminderAssignmentDatabaseListSchema = Schema.Array(Schema.Union(
  PulseReminderAssignmentDatabaseSchema,
  GuidingBeliefReminderAssignmentDatabaseSchema,
));

function reminderScheduleFromDatabase(
  schedule: typeof ReminderScheduleDatabaseSchema.Type,
) {
  return {
    ...schedule,
    schemaVersion: Number(schedule.schemaVersion),
    weekdays: schedule.weekdays.map(Number),
    times: schedule.times.map(({ hour, minute }) => ({
      hour: Number(hour),
      minute: Number(minute),
    })),
  };
}

function reminderAssignmentFromDatabase(
  assignment: typeof ReminderAssignmentDatabaseListSchema.Type[number],
): object {
  if (assignment.targetKind === REMINDER_TARGET_KINDS.GUIDING_BELIEF) {
    return { ...assignment, schemaVersion: Number(assignment.schemaVersion) };
  }
  const { beliefSystemId: _beliefSystemId, showFullText: _showFullText, ...pulse } = assignment;
  return { ...pulse, schemaVersion: Number(pulse.schemaVersion) };
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
  const schedules = yield* readTable(
    'SELECT scheduleId AS id, schemaVersion, name, weekdays, times, createdAt, updatedAt FROM reminder_schedule',
  );
  const assignments = yield* readTable(
    'SELECT assignmentId AS id, schemaVersion, scheduleId, targetKind, beliefSystemId, enabled, showFullText, createdAt, updatedAt FROM reminder_assignment',
  );
  return { schedules, assignments };
}).pipe(
  Effect.flatMap(({ schedules, assignments }) => Effect.all({
    schedules: Schema.decodeUnknown(ReminderScheduleDatabaseListSchema)(
      schedules[0]?.value ?? [],
    ).pipe(
      Effect.flatMap((decoded) => Schema.decodeUnknown(ReminderScheduleListSchema)(
        decoded.map(reminderScheduleFromDatabase),
      )),
    ),
    assignments: Schema.decodeUnknown(ReminderAssignmentDatabaseListSchema)(
      assignments[0]?.value ?? [],
    ).pipe(
      Effect.flatMap((decoded) => Schema.decodeUnknown(ReminderAssignmentListSchema)(
        decoded.map(reminderAssignmentFromDatabase),
      )),
    ),
  })),
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

export const persistReminderSchedule = Effect.fn('ReminderRepository.persistSchedule')(
  (schedule: ReminderSchedule) => Schema.encode(ReminderScheduleSchema)(schedule).pipe(
    Effect.mapError((cause) => ReminderDataError.make({ operation: 'encode', cause })),
    Effect.flatMap((encoded) => persistRecord({
    encoded: {
      scheduleId: encoded.id,
      schemaVersion: encoded.schemaVersion,
      name: encoded.name,
      weekdays: encoded.weekdays,
      times: encoded.times,
      createdAt: encoded.createdAt,
      updatedAt: encoded.updatedAt,
    },
    id: schedule.id,
    table: REMINDER_SCHEDULE_TABLE,
  }))),
);

export const persistReminderAssignment = Effect.fn('ReminderRepository.persistAssignment')(
  (assignment: ReminderAssignment) => Schema.encode(ReminderAssignmentSchema)(assignment).pipe(
    Effect.mapError((cause) => ReminderDataError.make({ operation: 'encode', cause })),
    Effect.flatMap((encoded) => persistRecord({
    encoded: encoded.targetKind === 'pulse'
      ? {
          assignmentId: encoded.id,
          schemaVersion: encoded.schemaVersion,
          scheduleId: encoded.scheduleId,
          targetKind: encoded.targetKind,
          enabled: encoded.enabled,
          createdAt: encoded.createdAt,
          updatedAt: encoded.updatedAt,
        }
      : {
          assignmentId: encoded.id,
          schemaVersion: encoded.schemaVersion,
          scheduleId: encoded.scheduleId,
          targetKind: encoded.targetKind,
          beliefSystemId: encoded.beliefSystemId,
          enabled: encoded.enabled,
          showFullText: encoded.showFullText,
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

export const deleteReminderSchedule = Effect.fn('ReminderRepository.deleteSchedule')(
  (id: ReminderScheduleId) => deleteRecord({ table: REMINDER_SCHEDULE_TABLE, id }),
);

export const deleteReminderAssignment = Effect.fn('ReminderRepository.deleteAssignment')(
  (id: ReminderAssignmentId) => deleteRecord({ table: REMINDER_ASSIGNMENT_TABLE, id }),
);
