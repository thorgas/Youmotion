import { CHECK_IN_TABLE } from '@/constants';
import {
  DatabaseMigrationId,
  type DatabaseMigration,
} from './database-migration';

export const occurrenceTimeDatabaseMigration = {
  id: DatabaseMigrationId.make('0001-backfill-check-in-occurrence-time'),
  description: 'Backfill missing check-in occurrence times from their creation times.',
  statement: `UPDATE ${CHECK_IN_TABLE}
SET occurredAt = createdAt
WHERE occurredAt = NONE;`,
} satisfies DatabaseMigration;
