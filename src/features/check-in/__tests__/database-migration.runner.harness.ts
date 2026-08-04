import { Directory, Paths } from 'expo-file-system';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { afterEach, describe, expect, test } from 'react-native-harness';
import {
  connect,
  type SurrealClient,
} from 'react-native-surrealdb';

import {
  CHECK_IN_TABLE,
  DATABASE_MIGRATION_TABLE,
  EMOTION_IDS,
  FILE_URI_PREFIX,
  SURREAL_DATABASE_ENDPOINT_PREFIX,
} from '@/constants';
import { occurrenceTimeDatabaseMigration } from '../infrastructure/migrations/occurrence-time.database-migration';
import { runDatabaseMigrations } from '../infrastructure/migrations/database-migration.runner';

const suppliedArchiveCheckInCount = 133;
const legacyIdPrefix = 'migration-e2e-legacy-';
const currentId = 'migration-e2e-current';
const fixtureDirectoryName = `youmotion-migration-harness-${Date.now()}`;
let fixtureDatabase: SurrealClient | undefined;

const MigratedRowSchema = Schema.Struct({
  checkInId: Schema.String,
  createdAt: Schema.String,
  occurredAt: Schema.String,
});
const MigratedRowListSchema = Schema.Array(MigratedRowSchema);

const legacyRows = Array.from({ length: suppliedArchiveCheckInCount }, (_, index) => ({
  id: `${legacyIdPrefix}${index}`,
  checkInId: `${legacyIdPrefix}${index}`,
  createdAt: new Date(Date.UTC(2026, 7, 3) - index * 60_000).toISOString(),
  emotionId: EMOTION_IDS.JOY,
  intensity: 0.5,
  level: 2,
  note: `Redacted legacy note ${index}`,
}));
const allIds = [...legacyRows.map((row) => row.id), currentId];

async function runStage<Value>({
  operation,
  stage,
}: {
  operation: () => Promise<Value>;
  stage: string;
}) {
  try {
    return await operation();
  } catch (cause) {
    const message = cause instanceof Error ? `${cause.name}: ${cause.message}` : String(cause);
    throw new Error(`${stage}: ${message}`, { cause });
  }
}

async function connectFixtureDatabase() {
  const directory = new Directory(Paths.cache, fixtureDirectoryName);
  directory.create({ idempotent: true, intermediates: true });
  if (!directory.uri.startsWith(FILE_URI_PREFIX)) {
    throw new Error('Migration Harness requires a local file URI.');
  }
  return connect({
    endpoint: `${SURREAL_DATABASE_ENDPOINT_PREFIX}${directory.uri.slice(FILE_URI_PREFIX.length)}`,
    namespace: 'youmotion-migration-harness',
    database: 'local',
  });
}

async function clearMigrationFixture(database: SurrealClient) {
  await database.query(
    `BEGIN TRANSACTION;
DELETE ${CHECK_IN_TABLE};
DELETE ${DATABASE_MIGRATION_TABLE};
COMMIT TRANSACTION;`,
  );
}

describe('versioned database migrations on the native runtime', () => {
  afterEach(async () => {
    if (!fixtureDatabase) return;
    try {
      await clearMigrationFixture(fixtureDatabase);
    } catch (cause) {
      console.warn('Migration fixture cleanup failed.', cause);
    }
    fixtureDatabase = undefined;
  });

  test('backfills all 133 supplied-archive-shaped rows and preserves current data', async () => {
    const database = await runStage({
      operation: connectFixtureDatabase,
      stage: 'connect fixture database',
    });
    fixtureDatabase = database;
    const explicitOccurrenceTime = '2026-08-01T10:00:00.000Z';
    await runStage({
      operation: () => database.query(`BEGIN TRANSACTION;
FOR $checkIn IN $checkIns {
  UPSERT type::record('${CHECK_IN_TABLE}', $checkIn.id) CONTENT $checkIn;
};
UPSERT type::record('${CHECK_IN_TABLE}', $current.id) CONTENT $current;
COMMIT TRANSACTION;`,
      {
        checkIns: legacyRows,
        current: {
          id: currentId,
          checkInId: currentId,
          createdAt: '2026-08-02T10:00:00.000Z',
          occurredAt: explicitOccurrenceTime,
          emotionId: EMOTION_IDS.JOY,
          intensity: 0.5,
          level: 2,
          note: '',
        },
      }),
      stage: 'seed fixture',
    });

    const firstRun = await runStage({
      operation: () => Effect.runPromise(runDatabaseMigrations(database)),
      stage: 'apply migration',
    });
    expect(firstRun).toEqual([
      occurrenceTimeDatabaseMigration.id,
    ]);
    const secondRun = await runStage({
      operation: () => Effect.runPromise(runDatabaseMigrations(database)),
      stage: 'rerun migration',
    });
    expect(secondRun).toEqual([]);

    const statements = await runStage({
      operation: () => database.query<unknown>(
        `SELECT checkInId, createdAt, occurredAt FROM ${CHECK_IN_TABLE} WHERE checkInId IN $ids`,
        { ids: allIds },
      ),
      stage: 'read migrated fixture',
    });
    const migratedRows = await Effect.runPromise(
      Schema.decodeUnknown(MigratedRowListSchema)(statements[0]?.value ?? []),
    );
    const migratedLegacyRows = migratedRows.filter((row) => row.checkInId !== currentId);
    const preservedCurrentRow = migratedRows.find((row) => row.checkInId === currentId);

    expect(migratedLegacyRows).toHaveLength(suppliedArchiveCheckInCount);
    expect(migratedLegacyRows.every((row) => row.occurredAt === row.createdAt)).toBe(true);
    expect(preservedCurrentRow?.occurredAt).toBe(explicitOccurrenceTime);
  });
});
