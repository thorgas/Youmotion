import {
  APP_SETTINGS_TABLE,
  BELIEF_STATEMENT_TABLE,
} from '@/constants';
import {
  DatabaseMigrationId,
  type DatabaseMigration,
} from './database-migration';

export const journalTablesDatabaseMigration = {
  id: DatabaseMigrationId.make('0004-define-journal-tables'),
  description: 'Define the belief statement and app settings tables a fresh install never created.',
  statement: `DEFINE TABLE IF NOT EXISTS ${BELIEF_STATEMENT_TABLE} SCHEMALESS;
DEFINE TABLE IF NOT EXISTS ${APP_SETTINGS_TABLE} SCHEMALESS;`,
} satisfies DatabaseMigration;
