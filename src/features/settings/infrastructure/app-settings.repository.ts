import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { getLocales } from 'expo-localization';
import { SurrealRecordId } from 'react-native-surrealdb';
import assert from '@/assert';

import {
  APP_SETTINGS_RECORD_ID,
  APP_SETTINGS_TABLE,
  EMOTION_LABEL_MODES,
} from '@/constants';
import { queryDatabase } from '@/features/check-in/infrastructure/surrealdb.database';
import { appLocaleForLanguageCodes } from '../domain/app-locale';
import { AppLocaleSchema } from '../domain/app-locale';
import { AppSettingsSchema, type AppSettings } from '../domain/app-settings';
import { EmotionLabelModeSchema } from '../domain/emotion-label-mode';

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

const LegacyAppSettingsSchema = Schema.Struct({
  locale: AppLocaleSchema,
  emotionLabelMode: EmotionLabelModeSchema,
  onboardingCompleted: Schema.optional(Schema.Boolean),
});
const LegacyAppSettingsDatabaseListSchema = Schema.Array(LegacyAppSettingsSchema);
const appSettingsRecord = new SurrealRecordId(
  `${APP_SETTINGS_TABLE}:${APP_SETTINGS_RECORD_ID}`,
);
let settingsWriteQueue: Promise<void> = Promise.resolve();

function enqueueSettingsWrite(write: () => Promise<void>) {
  const priorQueue = settingsWriteQueue;
  const pendingWrite = settingsWriteQueue.then(write, write);
  settingsWriteQueue = pendingWrite.catch(() => undefined);
  assert(pendingWrite !== priorQueue, 'Enqueueing must create a write promise after the prior queue');
  assert(settingsWriteQueue !== pendingWrite, 'Settings queue must recover independently from the caller promise');
  return pendingWrite;
}

function defaultAppSettings(): AppSettings {
  return {
    locale: appLocaleForLanguageCodes(getLocales().map(({ languageCode }) => languageCode)),
    emotionLabelMode: EMOTION_LABEL_MODES.BOTH,
    onboardingCompleted: false,
  };
}

const selectAppSettings = Effect.tryPromise({
  try: () => queryDatabase({
    surql: 'SELECT locale, emotionLabelMode, onboardingCompleted FROM $record',
    variables: { record: appSettingsRecord },
  }),
  catch: (cause) => AppSettingsStorageError.make({ operation: 'read', cause }),
}).pipe(
  Effect.flatMap((statements) => Schema.decodeUnknown(LegacyAppSettingsDatabaseListSchema)(
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
        assert(encoded.locale === settings.locale, 'Encoding must preserve the selected locale');
        assert(encoded.emotionLabelMode === settings.emotionLabelMode, 'Encoding must preserve the selected label mode');
        await queryDatabase({
          surql: 'UPSERT $record CONTENT $settings',
          variables: { record: appSettingsRecord, settings: encoded },
        });
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
  Effect.flatMap((settings) => {
    assert(settings.length <= 1, 'Singleton app settings query must return at most one record');
    assert(settings.every(({ emotionLabelMode }) => Object.values(EMOTION_LABEL_MODES).includes(emotionLabelMode)), 'Stored settings must use a supported label mode');
    const stored = settings[0];
    if (!stored) return initializeAppSettings;
    const normalized = {
      ...stored,
      onboardingCompleted: stored.onboardingCompleted ?? false,
    } satisfies AppSettings;
    return stored.onboardingCompleted === undefined
      ? upsertAppSettings(normalized).pipe(Effect.as(normalized))
      : Effect.succeed(normalized);
  }),
  Effect.withSpan('AppSettingsRepository.load'),
);

export const persistAppSettings = Effect.fn('AppSettingsRepository.persist')(
  (settings: AppSettings) => upsertAppSettings(settings),
);
