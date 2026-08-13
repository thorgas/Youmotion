import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import {
  APP_SETTINGS_RECORD_ID,
  APP_SETTINGS_TABLE,
  BELIEF_STATEMENT_TABLE,
  CHECK_IN_TABLE,
} from '@/constants';
import {
  BeliefStatementListSchema,
} from '@/features/check-in/domain/belief-statement';
import { CheckInListSchema } from '@/features/check-in/domain/check-in';
import { loadBeliefStatements } from '@/features/check-in/infrastructure/belief-statement.repository';
import { loadCheckIns } from '@/features/check-in/infrastructure/check-in.repository';
import { queryDatabase } from '@/features/check-in/infrastructure/surrealdb.database';
import { AppSettingsSchema } from '@/features/settings/domain/app-settings';
import { loadAppSettings } from '@/features/settings/infrastructure/app-settings.repository';
import {
  DataArchiveFromJson,
  DataArchiveSchema,
  DataArchiveTimestamp,
  DATA_ARCHIVE_VERSION,
  currentDataArchive,
  type DataArchive,
} from '../domain/data-archive';

export class DataArchiveStorageError extends Schema.TaggedError<DataArchiveStorageError>()(
  'DataArchiveStorageError',
  {
    operation: Schema.Literal('export', 'pick', 'read', 'restore', 'delete'),
    cause: Schema.Defect,
  },
) {}

export class DataArchiveDataError extends Schema.TaggedError<DataArchiveDataError>()(
  'DataArchiveDataError',
  {
    operation: Schema.Literal('decode', 'encode'),
    cause: Schema.Defect,
  },
) {}

const restoreTransaction = `
BEGIN TRANSACTION;
DELETE ${CHECK_IN_TABLE};
DELETE ${BELIEF_STATEMENT_TABLE};
DELETE ${APP_SETTINGS_TABLE};
FOR $checkIn IN $checkIns {
  UPSERT type::record('${CHECK_IN_TABLE}', $checkIn.id)
    CONTENT object::merge($checkIn, { checkInId: $checkIn.id });
};
FOR $statement IN $beliefStatements {
  UPSERT type::record('${BELIEF_STATEMENT_TABLE}', $statement.beliefSystemId)
    CONTENT object::merge($statement, { statementId: $statement.beliefSystemId });
};
UPSERT type::record('${APP_SETTINGS_TABLE}', '${APP_SETTINGS_RECORD_ID}') CONTENT $settings;
COMMIT TRANSACTION;
`;

const deleteJournalTransaction = `
BEGIN TRANSACTION;
DELETE ${CHECK_IN_TABLE};
DELETE ${BELIEF_STATEMENT_TABLE};
COMMIT TRANSACTION;
`;

export const createDataArchive = Effect.all({
  checkIns: loadCheckIns,
  beliefStatements: loadBeliefStatements,
  settings: loadAppSettings,
}).pipe(
  Effect.map(({ beliefStatements, checkIns, settings }) => DataArchiveSchema.make({
    version: DATA_ARCHIVE_VERSION,
    exportedAt: DataArchiveTimestamp.make(new Date().toISOString()),
    checkIns,
    beliefStatements,
    settings,
  })),
  Effect.withSpan('DataArchiveRepository.create'),
);

export const exportDataArchive = Effect.fn('DataArchiveRepository.export')(() => createDataArchive.pipe(
  Effect.flatMap((archive) => Schema.encode(DataArchiveFromJson)(archive).pipe(
    Effect.mapError((cause) => DataArchiveDataError.make({ operation: 'encode', cause })),
  )),
  Effect.flatMap((encoded) => Effect.tryPromise({
    try: async () => {
      if (!(await Sharing.isAvailableAsync())) {
        throw new Error('File sharing is unavailable.');
      }
      const date = new Date().toISOString().slice(0, 10);
      const file = new File(Paths.cache, `youmotion-backup-${date}.json`);
      file.create({ overwrite: true, intermediates: true });
      file.write(encoded);
      await Sharing.shareAsync(file.uri, {
        dialogTitle: 'Save your Youmotion backup',
        mimeType: 'application/json',
        UTI: 'public.json',
      });
    },
    catch: (cause) => DataArchiveStorageError.make({ operation: 'export', cause }),
  })),
));

export const pickDataArchive = Effect.fn('DataArchiveRepository.pick')(() => Effect.tryPromise({
  try: () => DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: false,
    type: 'application/json',
  }),
  catch: (cause) => DataArchiveStorageError.make({ operation: 'pick', cause }),
}).pipe(
  Effect.flatMap((result) => {
    if (result.canceled) return Effect.succeed<DataArchive | null>(null);
    const asset = result.assets[0];
    if (!asset) {
      return Effect.fail(DataArchiveDataError.make({
        operation: 'decode',
        cause: new Error('The document picker returned no file.'),
      }));
    }
    const file = new File(asset.uri);
    return Effect.tryPromise({
      try: () => file.text(),
      catch: (cause) => DataArchiveStorageError.make({ operation: 'read', cause }),
    }).pipe(
      Effect.flatMap((contents) => Schema.decodeUnknown(DataArchiveFromJson)(contents)),
      Effect.mapError((cause) => DataArchiveDataError.make({ operation: 'decode', cause })),
      Effect.map((archive): DataArchive | null => currentDataArchive(archive)),
    );
  }),
));

export const restoreDataArchive = Effect.fn('DataArchiveRepository.restore')(
  (archive: DataArchive) => Effect.all({
    checkIns: Schema.encode(CheckInListSchema)(archive.checkIns),
    beliefStatements: Schema.encode(BeliefStatementListSchema)(archive.beliefStatements),
    settings: Schema.encode(AppSettingsSchema)(archive.settings),
  }).pipe(
    Effect.mapError((cause) => DataArchiveDataError.make({ operation: 'encode', cause })),
    Effect.flatMap((variables) => Effect.tryPromise({
      try: async () => {
        await queryDatabase({ surql: restoreTransaction, variables });
      },
      catch: (cause) => DataArchiveStorageError.make({ operation: 'restore', cause }),
    })),
  ),
);

export const deleteAllJournalData = Effect.fn(
  'DataArchiveRepository.deleteAllJournalData',
)(() => Effect.tryPromise({
  try: async () => {
    await queryDatabase({ surql: deleteJournalTransaction });
  },
  catch: (cause) => DataArchiveStorageError.make({ operation: 'delete', cause }),
}));
