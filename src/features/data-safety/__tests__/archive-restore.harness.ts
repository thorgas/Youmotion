import { Directory, Paths } from 'expo-file-system';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'react-native-harness';
import {
  connect,
  type SurrealClient,
} from 'react-native-surrealdb';

import {
  APP_SETTINGS_RECORD_ID,
  APP_SETTINGS_TABLE,
  BELIEF_STATEMENT_TABLE,
  CHECK_IN_TABLE,
  EMOTION_IDS,
  FILE_URI_PREFIX,
  SURREAL_DATABASE_ENDPOINT_PREFIX,
} from '@/constants';
import { runDatabaseMigrations } from '@/infrastructure/database/migrations/database-migration.runner';

const RestoredIdListSchema = Schema.Array(Schema.String);

const fixtureDirectoryName = `youmotion-restore-harness-${Date.now()}`;

const restoreTransaction = `
BEGIN TRANSACTION;
DELETE ${CHECK_IN_TABLE};
DELETE ${BELIEF_STATEMENT_TABLE};
DELETE ${APP_SETTINGS_TABLE};
FOR $checkIn IN $checkIns {
  UPSERT type::record('${CHECK_IN_TABLE}', $checkIn.id)
    CONTENT object::extend($checkIn, { checkInId: $checkIn.id });
};
FOR $statement IN $beliefStatements {
  UPSERT type::record('${BELIEF_STATEMENT_TABLE}', $statement.beliefSystemId)
    CONTENT object::extend($statement, { statementId: $statement.beliefSystemId });
};
UPSERT type::record('${APP_SETTINGS_TABLE}', '${APP_SETTINGS_RECORD_ID}') CONTENT $settings;
COMMIT TRANSACTION;
`;

const archiveCheckIns = [{
  id: 'restore-harness-moment',
  createdAt: '2026-08-03T10:00:00.000Z',
  occurredAt: '2026-08-03T10:00:00.000Z',
  emotionId: EMOTION_IDS.JOY,
  intensity: 0.5,
  level: 2,
  note: 'Redacted restored note',
}];

const archiveBeliefStatements = [{
  kind: 'built-in',
  beliefSystemId: 'always-functioning',
  guidingStatement: 'I may pause and still be enough.',
}, {
  kind: 'custom',
  beliefSystemId: 'custom-restore-harness',
  harmfulStatement: 'I must never need help.',
  guidingStatement: 'I can ask for support.',
}];

const archiveSettings = {
  locale: 'en',
  emotionLabelMode: 'emoji',
  onboardingCompleted: true,
};

async function connectFixtureDatabase() {
  const directory = new Directory(Paths.cache, fixtureDirectoryName);
  directory.create({ idempotent: true, intermediates: true });
  if (!directory.uri.startsWith(FILE_URI_PREFIX)) {
    throw new Error('Restore Harness requires a local file URI.');
  }
  return connect({
    endpoint: `${SURREAL_DATABASE_ENDPOINT_PREFIX}${directory.uri.slice(FILE_URI_PREFIX.length)}`,
    namespace: 'youmotion-restore-harness',
    database: 'local',
  });
}

describe('archive restore on the native runtime', () => {
  test('migrates a fresh database and restores the supplied archive shape', async () => {
    const database: SurrealClient = await connectFixtureDatabase();

    let migrationFailure = 'none';
    try {
      await Effect.runPromise(runDatabaseMigrations(database));
    } catch (cause) {
      migrationFailure = cause instanceof Error ? cause.message : String(cause);
    }
    expect(`migration=${migrationFailure}`).toBe('migration=none');

    let restoreFailure = 'none';
    try {
      await database.query(restoreTransaction, {
        checkIns: archiveCheckIns,
        beliefStatements: archiveBeliefStatements,
        settings: archiveSettings,
      });
    } catch (cause) {
      restoreFailure = cause instanceof Error ? cause.message : String(cause);
    }
    expect(`restore=${restoreFailure}`).toBe('restore=none');

    const statements = await database.query<unknown>(
      `SELECT VALUE statementId FROM ${BELIEF_STATEMENT_TABLE}`,
    );
    const moments = await database.query<unknown>(
      `SELECT VALUE checkInId FROM ${CHECK_IN_TABLE}`,
    );
    const restoredStatementIds = await Effect.runPromise(
      Schema.decodeUnknown(RestoredIdListSchema)(statements[0]?.value ?? []),
    );
    const restoredMomentIds = await Effect.runPromise(
      Schema.decodeUnknown(RestoredIdListSchema)(moments[0]?.value ?? []),
    );
    expect(restoredStatementIds).toHaveLength(archiveBeliefStatements.length);
    expect(restoredMomentIds).toHaveLength(archiveCheckIns.length);
  });
});
