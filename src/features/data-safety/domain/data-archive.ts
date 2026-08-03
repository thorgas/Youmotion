import * as Schema from 'effect/Schema';

import { BeliefStatementListSchema } from '@/features/check-in/domain/belief-statement';
import { CheckInListSchema } from '@/features/check-in/domain/check-in';
import { AppSettingsSchema } from '@/features/settings/domain/app-settings';

export const DATA_ARCHIVE_VERSION = 1;

export const DataArchiveTimestamp = Schema.String.pipe(
  Schema.brand('DataArchiveTimestamp'),
);

export const DataArchiveSchema = Schema.Struct({
  version: Schema.Literal(DATA_ARCHIVE_VERSION),
  exportedAt: DataArchiveTimestamp,
  checkIns: CheckInListSchema,
  beliefStatements: BeliefStatementListSchema,
  settings: AppSettingsSchema,
});

export type DataArchive = typeof DataArchiveSchema.Type;

export const DataArchiveFromJson = Schema.parseJson(DataArchiveSchema);

export function dataArchiveSummary(archive: DataArchive) {
  return {
    exportedAt: archive.exportedAt,
    checkInCount: archive.checkIns.length,
    beliefStatementCount: archive.beliefStatements.length,
  };
}
