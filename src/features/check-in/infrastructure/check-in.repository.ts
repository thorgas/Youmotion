import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { SurrealRecordId } from 'react-native-surrealdb';

import {
  CHECK_IN_STORAGE_KEY,
  CHECK_IN_TABLE,
} from '@/constants';

import {
  CheckInId,
  PersistedCheckInListFromJson,
  CheckInSchema,
  CheckInTimestamp,
  withOccurrenceTime,
  type CheckIn,
  type EmotionSelection,
} from '../domain/check-in';
import { BeliefStatementText, BeliefSystemId } from '../domain/belief-statement';
import { queryDatabase } from './surrealdb.database';

export class CheckInStorageError extends Schema.TaggedError<CheckInStorageError>()(
  'CheckInStorageError',
  {
    operation: Schema.Literal('read', 'write', 'delete', 'migrate'),
    cause: Schema.Defect,
  },
) {}

export class CheckInDataError extends Schema.TaggedError<CheckInDataError>()(
  'CheckInDataError',
  {
    operation: Schema.Literal('decode', 'encode'),
    cause: Schema.Defect,
  },
) {}

const SurrealNonNegativeInteger = Schema.Union(
  Schema.Int.pipe(Schema.nonNegative()),
  Schema.transform(
    Schema.BigIntFromSelf.pipe(
      Schema.betweenBigInt(0n, BigInt(Number.MAX_SAFE_INTEGER)),
    ),
    Schema.Int.pipe(Schema.nonNegative()),
    {
      strict: true,
      decode: (value) => Number(value),
      encode: (value) => BigInt(value),
    },
  ),
);

const SurrealIntensity = Schema.Union(
  CheckInSchema.fields.intensity,
  Schema.transform(
    Schema.BigIntFromSelf.pipe(Schema.betweenBigInt(0n, 1n)),
    CheckInSchema.fields.intensity,
    {
      strict: true,
      decode: (value) => Number(value),
      encode: (value) => BigInt(value),
    },
  ),
);

const SurrealNoneSchema = Schema.Struct({ kind: Schema.Literal('none') });
const SurrealOptionalBeliefSystemId = Schema.Union(BeliefSystemId, SurrealNoneSchema);

const CheckInDatabaseSchema = Schema.Struct({
  id: CheckInId,
  createdAt: CheckInTimestamp,
  occurredAt: CheckInTimestamp,
  emotionId: CheckInSchema.fields.emotionId,
  intensity: SurrealIntensity,
  level: Schema.optional(SurrealNonNegativeInteger),
  note: CheckInSchema.fields.note,
  beliefSystemId: Schema.optional(SurrealOptionalBeliefSystemId),
  guidingStatementSnapshot: Schema.optional(Schema.Union(
    BeliefStatementText,
    SurrealNoneSchema,
  )),
});

const CheckInDatabaseListSchema = Schema.Array(CheckInDatabaseSchema);

function checkInFromDatabase(
  entry: typeof CheckInDatabaseSchema.Type,
): CheckIn {
  const {
    beliefSystemId,
    guidingStatementSnapshot,
    ...checkIn
  } = entry;
  const statementSnapshot = typeof guidingStatementSnapshot === 'string'
    ? { guidingStatementSnapshot }
    : {};
  if (beliefSystemId === undefined || typeof beliefSystemId !== 'string') {
    return { ...checkIn, ...statementSnapshot };
  }
  return { ...checkIn, beliefSystemId, ...statementSnapshot };
}

const readLegacy = Effect.tryPromise({
  try: () => AsyncStorage.getItem(CHECK_IN_STORAGE_KEY),
  catch: (cause) => CheckInStorageError.make({ operation: 'read', cause }),
});

const decodeLegacy = readLegacy.pipe(
  Effect.flatMap((raw) => {
    if (raw === null) return Effect.succeed<readonly CheckIn[]>([]);
    return Schema.decodeUnknown(PersistedCheckInListFromJson)(raw).pipe(
      Effect.mapError((cause) => CheckInDataError.make({ operation: 'decode', cause })),
      Effect.map((entries) => entries.map(withOccurrenceTime)),
    );
  }),
);

const selectCheckIns = Effect.tryPromise({
  try: () => queryDatabase({
    surql: `SELECT checkInId AS id, createdAt, occurredAt, emotionId, intensity, level, note, beliefSystemId, guidingStatementSnapshot FROM ${CHECK_IN_TABLE} ORDER BY occurredAt DESC, createdAt DESC`,
  }),
  catch: (cause) => CheckInStorageError.make({ operation: 'read', cause }),
}).pipe(
  Effect.flatMap((statements) => Schema.decodeUnknown(CheckInDatabaseListSchema)(statements[0]?.value ?? []).pipe(
    Effect.mapError((cause) => CheckInDataError.make({ operation: 'decode', cause })),
    Effect.map((entries) => entries.map(checkInFromDatabase)),
  )),
);

const upsertCheckIn = Effect.fn('CheckInRepository.upsert')((checkIn: CheckIn) => (
  Schema.encode(CheckInSchema)(checkIn).pipe(
    Effect.mapError((cause) => CheckInDataError.make({ operation: 'encode', cause })),
    Effect.flatMap((encoded) => Effect.tryPromise({
      try: async () => {
        await queryDatabase({
          surql: 'UPSERT $record CONTENT $checkIn',
          variables: {
            record: new SurrealRecordId(`${CHECK_IN_TABLE}:${checkIn.id}`),
            checkIn: { ...encoded, checkInId: encoded.id },
          },
        });
      },
      catch: (cause) => CheckInStorageError.make({ operation: 'write', cause }),
    })),
  )
));

const migrateLegacyCheckIns = decodeLegacy.pipe(
  Effect.flatMap((entries) => Effect.forEach(entries, upsertCheckIn, { concurrency: 1 }).pipe(
    Effect.flatMap(() => Effect.tryPromise({
      try: () => AsyncStorage.removeItem(CHECK_IN_STORAGE_KEY),
      catch: (cause) => CheckInStorageError.make({ operation: 'migrate', cause }),
    })),
    Effect.as(entries),
  )),
);

export const loadCheckIns = selectCheckIns.pipe(
  Effect.flatMap((entries) => (
    entries.length === 0 ? migrateLegacyCheckIns : Effect.succeed(entries)
  )),
  Effect.withSpan('CheckInRepository.load'),
);

export const persistCheckIn = Effect.fn('CheckInRepository.persist')(({
  selection,
  note,
  occurredAt,
  beliefSystemId,
  existing,
}: {
  selection: EmotionSelection;
  note: string;
  occurredAt: CheckInTimestamp;
  beliefSystemId: CheckIn['beliefSystemId'] | null;
  existing: CheckIn | null;
}) => {
  const identity = existing ?? {
    id: CheckInId.make(`${Date.now()}-${Math.random().toString(16).slice(2)}`),
    createdAt: CheckInTimestamp.make(new Date().toISOString()),
  };
  const beliefSystem = beliefSystemId === null ? {} : { beliefSystemId };
  const existingStatementSnapshot = existing?.guidingStatementSnapshot;
  const guidingStatementSnapshot = beliefSystemId !== null
    && beliefSystemId === existing?.beliefSystemId
    && existingStatementSnapshot
    ? { guidingStatementSnapshot: existingStatementSnapshot }
    : {};
  const checkIn: CheckIn = {
    id: identity.id,
    createdAt: identity.createdAt,
    occurredAt,
    emotionId: selection.emotionId,
    intensity: selection.intensity,
    level: selection.level,
    note: note.trim(),
    ...beliefSystem,
    ...guidingStatementSnapshot,
  };
  return upsertCheckIn(checkIn).pipe(Effect.as(checkIn));
});

export const persistGuidingStatementSnapshot = Effect.fn(
  'CheckInRepository.persistGuidingStatementSnapshot',
)(({
  checkIn,
  guidingStatement,
}: {
  checkIn: CheckIn;
  guidingStatement: typeof BeliefStatementText.Type;
}) => {
  const updated = CheckInSchema.make({
    ...checkIn,
    guidingStatementSnapshot: guidingStatement,
  });
  return upsertCheckIn(updated).pipe(Effect.as(updated));
});

export const deleteCheckIn = Effect.fn('CheckInRepository.delete')((id: CheckInId) => (
  Effect.tryPromise({
    try: async () => {
      await queryDatabase({
        surql: 'DELETE $record',
        variables: { record: new SurrealRecordId(`${CHECK_IN_TABLE}:${id}`) },
      });
    },
    catch: (cause) => CheckInStorageError.make({ operation: 'delete', cause }),
  })
));
