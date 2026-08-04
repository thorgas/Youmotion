import * as Effect from 'effect/Effect';

import { DATABASE_MIGRATION_TABLE } from '@/constants';
import { occurrenceTimeDatabaseMigration } from '../infrastructure/migrations/occurrence-time.database-migration';
import { runDatabaseMigrations } from '../infrastructure/migrations/database-migration.runner';

const query = jest.fn();
const database = { query };

describe('database migration runner', () => {
  beforeEach(() => {
    query.mockReset();
  });

  it('applies every pending migration transactionally and records its ledger entry', async () => {
    query
      .mockResolvedValueOnce([{ statementIndex: 0, value: null }])
      .mockResolvedValueOnce([{ statementIndex: 0, value: [] }])
      .mockResolvedValueOnce([{ statementIndex: 0, value: null }]);

    const applied = await Effect.runPromise(runDatabaseMigrations(database));

    expect(applied).toEqual([occurrenceTimeDatabaseMigration.id]);
    expect(query).toHaveBeenNthCalledWith(
      1,
      `DEFINE TABLE IF NOT EXISTS ${DATABASE_MIGRATION_TABLE} SCHEMALESS`,
    );
    expect(query).toHaveBeenNthCalledWith(
      2,
      `SELECT migrationId FROM ${DATABASE_MIGRATION_TABLE}`,
    );
    expect(query).toHaveBeenNthCalledWith(
      3,
      expect.stringMatching(
        /BEGIN TRANSACTION;[\s\S]*UPDATE check_in[\s\S]*WHERE occurredAt = NONE;[\s\S]*UPSERT \$migrationRecord[\s\S]*COMMIT TRANSACTION;/,
      ),
      expect.objectContaining({
        ledgerEntry: expect.objectContaining({
          migrationId: occurrenceTimeDatabaseMigration.id,
          description: occurrenceTimeDatabaseMigration.description,
          appliedAt: expect.any(String),
        }),
        migrationRecord: expect.objectContaining({
          kind: 'record',
          value: `${DATABASE_MIGRATION_TABLE}:${occurrenceTimeDatabaseMigration.id}`,
        }),
      }),
    );
  });

  it('does not rerun a migration already recorded in the ledger', async () => {
    query
      .mockResolvedValueOnce([{ statementIndex: 0, value: null }])
      .mockResolvedValueOnce([{
        statementIndex: 0,
        value: [{ migrationId: occurrenceTimeDatabaseMigration.id }],
      }]);

    await expect(Effect.runPromise(runDatabaseMigrations(database))).resolves.toEqual([]);
    expect(query).toHaveBeenCalledTimes(2);
  });

  it('rejects malformed ledger data before applying a migration', async () => {
    query
      .mockResolvedValueOnce([{ statementIndex: 0, value: null }])
      .mockResolvedValueOnce([{
        statementIndex: 0,
        value: [{ migrationId: 1 }],
      }]);

    const error = await Effect.runPromise(Effect.flip(runDatabaseMigrations(database)));

    expect(error).toMatchObject({
      _tag: 'DatabaseMigrationDataError',
      operation: 'decode-ledger',
    });
    expect(query).toHaveBeenCalledTimes(2);
  });

  it('leaves a failed migration unapplied so a later connection can retry it', async () => {
    query
      .mockResolvedValueOnce([{ statementIndex: 0, value: null }])
      .mockResolvedValueOnce([{ statementIndex: 0, value: [] }])
      .mockRejectedValueOnce(new Error('transaction interrupted'));

    const error = await Effect.runPromise(Effect.flip(runDatabaseMigrations(database)));

    expect(error).toMatchObject({
      _tag: 'DatabaseMigrationStorageError',
      operation: 'apply',
      migrationId: occurrenceTimeDatabaseMigration.id,
    });
  });

  it('reports a fresh-database ledger bootstrap failure', async () => {
    query.mockRejectedValueOnce(new Error('table definition failed'));

    const error = await Effect.runPromise(Effect.flip(runDatabaseMigrations(database)));

    expect(error).toMatchObject({
      _tag: 'DatabaseMigrationStorageError',
      operation: 'prepare-ledger',
    });
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('reports a ledger read failure after a successful bootstrap', async () => {
    query
      .mockResolvedValueOnce([{ statementIndex: 0, value: null }])
      .mockRejectedValueOnce(new Error('ledger read failed'));

    const error = await Effect.runPromise(Effect.flip(runDatabaseMigrations(database)));

    expect(error).toMatchObject({
      _tag: 'DatabaseMigrationStorageError',
      operation: 'read-ledger',
    });
    expect(query).toHaveBeenCalledTimes(2);
  });
});
