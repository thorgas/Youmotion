import {
  REMINDER_ASSIGNMENT_TABLE,
  REMINDER_SCHEDULE_TABLE,
} from '@/constants';
import {
  DatabaseMigrationId,
  type DatabaseMigration,
} from './database-migration';

export const reminderTablesDatabaseMigration = {
  id: DatabaseMigrationId.make('0002-define-reminder-tables'),
  description: 'Define the device-local reminder schedule and assignment tables.',
  statement: `DEFINE TABLE IF NOT EXISTS ${REMINDER_SCHEDULE_TABLE} SCHEMALESS;
DEFINE TABLE IF NOT EXISTS ${REMINDER_ASSIGNMENT_TABLE} SCHEMALESS;`,
} satisfies DatabaseMigration;
