import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { getLocales } from 'expo-localization';
import { SurrealRecordId } from 'react-native-surrealdb';

import {
  APP_SETTINGS_RECORD_ID,
  APP_SETTINGS_TABLE,
  EMOTION_LABEL_MODES,
} from '@/constants';
import { getDatabase } from '@/features/check-in/infrastructure/surrealdb.database';
import { appLocaleForLanguageCodes } from '../domain/app-locale';
import { AppSettingsSchema, type AppSettings } from '../domain/app-settings';

export class AppSettingsStorageError extends Schema.TaggedError<AppSettingsStorageError>()(
  'AppSettingsStorageError',
  {
    operation: Schema.Literal('read', 'write'),
    cause: Schema.Defect,
  },
) {}

export class AppSettingsDataError extends Schema.TaggedError<AppSettingsDataError>()(
  'AppSettingsDataError',
  {
    operation: Schema.Literal('decode', 'encode'),
    cause: Schema.Defect,
  },
) {}

const AppSettingsDatabaseListSchema = Schema.Array(AppSettingsSchema);
const appSettingsRecord = new SurrealRecordId(
  `${APP_SETTINGS_TABLE}:${APP_SETTINGS_RECORD_ID}`,
);
let settingsWriteQueue: Promise<void> = Promise.resolve();

function enqueueSettingsWrite(write: () => Promise<void>) {
  const pendingWrite = settingsWriteQueue.then(write, write);
  settingsWriteQueue = pendingWrite.catch(() => undefined);
  return pendingWrite;
}

function defaultAppSettings(): AppSettings {
  return {
    locale: appLocaleForLanguageCodes(getLocales().map(({ languageCode }) => languageCode)),
    emotionLabelMode: EMOTION_LABEL_MODES.EMOJI,
  };
}

const selectAppSettings = Effect.tryPromise({
  try: async () => {
    const database = await getDatabase();
    return database.query<unknown>(
      'SELECT locale, emotionLabelMode FROM $record',
      { record: appSettingsRecord },
    );
  },
  catch: (cause) => AppSettingsStorageError.make({ operation: 'read', cause }),
}).pipe(
  Effect.flatMap((statements) => Schema.decodeUnknown(AppSettingsDatabaseListSchema)(
    statements[0]?.value ?? [],
  ).pipe(
    Effect.mapError((cause) => AppSettingsDataError.make({ operation: 'decode', cause })),
  )),
);

const upsertAppSettings = Effect.fn('AppSettingsRepository.upsert')((settings: AppSettings) => (
  Schema.encode(AppSettingsSchema)(settings).pipe(
    Effect.mapError((cause) => AppSettingsDataError.make({ operation: 'encode', cause })),
    Effect.flatMap((encoded) => Effect.tryPromise({
      try: () => enqueueSettingsWrite(async () => {
        const database = await getDatabase();
        await database.query(
          'UPSERT $record CONTENT $settings',
          { record: appSettingsRecord, settings: encoded },
        );
      }),
      catch: (cause) => AppSettingsStorageError.make({ operation: 'write', cause }),
    })),
  )
));

const initializeAppSettings = Effect.suspend(() => {
  const settings = defaultAppSettings();
  return upsertAppSettings(settings).pipe(Effect.as(settings));
});

export const loadAppSettings = selectAppSettings.pipe(
  Effect.flatMap((settings) => settings[0]
    ? Effect.succeed(settings[0])
    : initializeAppSettings),
  Effect.withSpan('AppSettingsRepository.load'),
);

export const persistAppSettings = Effect.fn('AppSettingsRepository.persist')(
  (settings: AppSettings) => upsertAppSettings(settings),
);
