import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { SurrealRecordId, type SurrealClient } from 'react-native-surrealdb';

import { DATABASE_MIGRATION_TABLE } from '@/constants';
import {
  DatabaseMigrationId,
  type DatabaseMigration,
} from './database-migration';
import { DATABASE_MIGRATIONS } from './database-migrations';

type DatabaseMigrationClient = Pick<SurrealClient, 'query'>;

export class DatabaseMigrationStorageError
  extends Schema.TaggedError<DatabaseMigrationStorageError>()(
    'DatabaseMigrationStorageError',
    {
      operation: Schema.Literal('prepare-ledger', 'read-ledger', 'apply'),
      migrationId: Schema.optional(DatabaseMigrationId),
      cause: Schema.Defect,
    },
  ) {}

export class DatabaseMigrationDataError
  extends Schema.TaggedError<DatabaseMigrationDataError>()(
    'DatabaseMigrationDataError',
    {
      operation: Schema.Literal('decode-ledger'),
      cause: Schema.Defect,
    },
  ) {}

const AppliedDatabaseMigrationSchema = Schema.Struct({
  migrationId: DatabaseMigrationId,
});
const AppliedDatabaseMigrationListSchema = Schema.Array(AppliedDatabaseMigrationSchema);

const prepareMigrationLedger = Effect.fn(
  'DatabaseMigrationRunner.prepareMigrationLedger',
)((database: DatabaseMigrationClient) => Effect.tryPromise({
  try: () => database.query(
    `DEFINE TABLE IF NOT EXISTS ${DATABASE_MIGRATION_TABLE} SCHEMALESS`,
  ),
  catch: (cause) => DatabaseMigrationStorageError.make({
    operation: 'prepare-ledger',
    cause,
  }),
}));

const readAppliedMigrationIds = Effect.fn(
  'DatabaseMigrationRunner.readAppliedMigrationIds',
)((database: DatabaseMigrationClient) => Effect.tryPromise({
  try: () => database.query<unknown>(
    `SELECT migrationId FROM ${DATABASE_MIGRATION_TABLE}`,
  ),
  catch: (cause) => DatabaseMigrationStorageError.make({
    operation: 'read-ledger',
    cause,
  }),
}).pipe(
  Effect.flatMap((statements) => Schema.decodeUnknown(
    AppliedDatabaseMigrationListSchema,
  )(statements[0]?.value ?? []).pipe(
    Effect.mapError((cause) => DatabaseMigrationDataError.make({
      operation: 'decode-ledger',
      cause,
    })),
  )),
  Effect.map((entries) => new Set(entries.map((entry) => entry.migrationId))),
));

const applyDatabaseMigration = Effect.fn(
  'DatabaseMigrationRunner.applyDatabaseMigration',
)(({
  database,
  migration,
}: {
  database: DatabaseMigrationClient;
  migration: DatabaseMigration;
}) => Effect.tryPromise({
  try: () => database.query(
    `BEGIN TRANSACTION;
${migration.statement}
UPSERT $migrationRecord CONTENT $ledgerEntry;
COMMIT TRANSACTION;`,
    {
      migrationRecord: new SurrealRecordId(
        `${DATABASE_MIGRATION_TABLE}:${migration.id}`,
      ),
      ledgerEntry: {
        migrationId: migration.id,
        description: migration.description,
        appliedAt: new Date().toISOString(),
      },
    },
  ),
  catch: (cause) => DatabaseMigrationStorageError.make({
    operation: 'apply',
    migrationId: migration.id,
    cause,
  }),
}));

export const runDatabaseMigrations = Effect.fn(
  'DatabaseMigrationRunner.run',
)((database: DatabaseMigrationClient) => prepareMigrationLedger(database).pipe(
  Effect.andThen(readAppliedMigrationIds(database)),
  Effect.flatMap((appliedMigrationIds) => Effect.forEach(
    DATABASE_MIGRATIONS.filter((migration) => !appliedMigrationIds.has(migration.id)),
    (migration) => applyDatabaseMigration({ database, migration }).pipe(
      Effect.as(migration.id),
    ),
    { concurrency: 1 },
  )),
));
