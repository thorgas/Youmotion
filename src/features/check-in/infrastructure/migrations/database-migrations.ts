import type { DatabaseMigration } from './database-migration';
import { occurrenceTimeDatabaseMigration } from './occurrence-time.database-migration';
import { reminderTablesDatabaseMigration } from './reminder-tables.database-migration';
import { inlineReminderTimingDatabaseMigration } from './inline-reminder-timing.database-migration';

export const DATABASE_MIGRATIONS: readonly DatabaseMigration[] = [
  occurrenceTimeDatabaseMigration,
  reminderTablesDatabaseMigration,
  inlineReminderTimingDatabaseMigration,
];
