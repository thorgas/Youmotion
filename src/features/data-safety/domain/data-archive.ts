import * as Schema from 'effect/Schema';

import { BeliefStatementListSchema } from '@/features/beliefs/domain/belief-statement';
import {
  CheckInListSchema,
  LegacyCheckInListSchema,
  withOccurrenceTime,
} from '@/features/check-in/domain/check-in';
import { AppSettingsSchema } from '@/features/settings/domain/app-settings';

export const DATA_ARCHIVE_VERSION = 2;

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

const LegacyDataArchiveSchema = Schema.Struct({
  version: Schema.Literal(1),
  exportedAt: DataArchiveTimestamp,
  checkIns: LegacyCheckInListSchema,
  beliefStatements: BeliefStatementListSchema,
  settings: AppSettingsSchema,
});

export const PersistedDataArchiveSchema = Schema.Union(
  DataArchiveSchema,
  LegacyDataArchiveSchema,
);
export const DataArchiveFromJson = Schema.parseJson(PersistedDataArchiveSchema);

export function currentDataArchive(
  archive: typeof PersistedDataArchiveSchema.Type,
): DataArchive {
  if (archive.version === DATA_ARCHIVE_VERSION) return archive;
  return DataArchiveSchema.make({
    ...archive,
    version: DATA_ARCHIVE_VERSION,
    checkIns: archive.checkIns.map(withOccurrenceTime),
  });
}

export function dataArchiveSummary(archive: DataArchive) {
  return {
    exportedAt: archive.exportedAt,
    checkInCount: archive.checkIns.length,
    beliefStatementCount: archive.beliefStatements.length,
  };
}
