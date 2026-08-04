import type { DatabaseMigration } from './database-migration';
import { occurrenceTimeDatabaseMigration } from './occurrence-time.database-migration';

export const DATABASE_MIGRATIONS: readonly DatabaseMigration[] = [
  occurrenceTimeDatabaseMigration,
];
