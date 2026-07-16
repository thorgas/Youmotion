import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { SurrealRecordId } from 'react-native-surrealdb';

import {
  CHECK_IN_STORAGE_KEY,
  CHECK_IN_TABLE,
  MAX_CHECK_IN_HISTORY,
} from '@/constants';

import {
  CheckInId,
  CheckInListFromJson,
  CheckInSchema,
  CheckInTimestamp,
  type CheckIn,
  type EmotionSelection,
} from '../domain/check-in';
import { getDatabase } from './surrealdb.database';

export class CheckInStorageError extends Schema.TaggedError<CheckInStorageError>()(
  'CheckInStorageError',
  {
    operation: Schema.Literal('read', 'write', 'migrate'),
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

const CheckInDatabaseSchema = Schema.Struct({
  id: CheckInId,
  createdAt: CheckInTimestamp,
  emotionId: CheckInSchema.fields.emotionId,
  intensity: CheckInSchema.fields.intensity,
  level: Schema.optional(SurrealNonNegativeInteger),
  note: CheckInSchema.fields.note,
});

const CheckInDatabaseListSchema = Schema.Array(CheckInDatabaseSchema);

const readLegacy = Effect.tryPromise({
  try: () => AsyncStorage.getItem(CHECK_IN_STORAGE_KEY),
  catch: (cause) => CheckInStorageError.make({ operation: 'read', cause }),
});

const decodeLegacy = readLegacy.pipe(
  Effect.flatMap((raw) => {
    if (raw === null) return Effect.succeed<readonly CheckIn[]>([]);
    return Schema.decodeUnknown(CheckInListFromJson)(raw).pipe(
      Effect.mapError((cause) => CheckInDataError.make({ operation: 'decode', cause })),
    );
  }),
);

const selectRecentCheckIns = Effect.tryPromise({
  try: async () => {
    const database = await getDatabase();
    return database.query<unknown>(
      `SELECT checkInId AS id, createdAt, emotionId, intensity, level, note FROM ${CHECK_IN_TABLE} ORDER BY createdAt DESC LIMIT $limit`,
      { limit: MAX_CHECK_IN_HISTORY },
    );
  },
  catch: (cause) => CheckInStorageError.make({ operation: 'read', cause }),
}).pipe(
  Effect.flatMap((statements) => Schema.decodeUnknown(CheckInDatabaseListSchema)(statements[0]?.value ?? []).pipe(
    Effect.mapError((cause) => CheckInDataError.make({ operation: 'decode', cause })),
  )),
);

const upsertCheckIn = Effect.fn('CheckInRepository.upsert')((checkIn: CheckIn) => (
  Schema.encode(CheckInSchema)(checkIn).pipe(
    Effect.mapError((cause) => CheckInDataError.make({ operation: 'encode', cause })),
    Effect.flatMap((encoded) => Effect.tryPromise({
      try: async () => {
        const database = await getDatabase();
        await database.query(
          `UPSERT $record CONTENT $checkIn`,
          {
            record: new SurrealRecordId(`${CHECK_IN_TABLE}:${checkIn.id}`),
            checkIn: { ...encoded, checkInId: encoded.id },
          },
        );
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

export const loadCheckIns = selectRecentCheckIns.pipe(
  Effect.flatMap((entries) => (
    entries.length === 0 ? migrateLegacyCheckIns : Effect.succeed(entries)
  )),
  Effect.withSpan('CheckInRepository.load'),
);

export const persistCheckIn = Effect.fn('CheckInRepository.persist')(({
  selection,
  note,
  existing,
}: {
  selection: EmotionSelection;
  note: string;
  existing: CheckIn | null;
}) => {
  const identity = existing ?? {
    id: CheckInId.make(`${Date.now()}-${Math.random().toString(16).slice(2)}`),
    createdAt: CheckInTimestamp.make(new Date().toISOString()),
  };
  const checkIn: CheckIn = {
    id: identity.id,
    createdAt: identity.createdAt,
    emotionId: selection.emotionId,
    intensity: selection.intensity,
    level: selection.level,
    note: note.trim(),
  };
  return upsertCheckIn(checkIn).pipe(Effect.as(checkIn));
});
