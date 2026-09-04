import { createStore } from '@xstate/store';
import * as Schema from 'effect/Schema';
import Constants from 'expo-constants';
import { getLocales } from 'expo-localization';
import * as Updates from 'expo-updates';

import {
  EMOTION_LABEL_MODES,
} from '@/constants';
import {
  appLocaleForLanguageCodes,
  AppLocaleSchema,
} from '../domain/app-locale';
import { AppSettingsSchema, type AppSettings } from '../domain/app-settings';
import { EmotionLabelModeSchema } from '../domain/emotion-label-mode';

const configuredGitCommit: unknown = Constants.expoConfig?.extra?.['gitCommit'];

export type AppSettingsContext = AppSettings & {
  appVersion: string | null;
  updateChannel: string | null;
  gitCommit: string | null;
  hydrated: boolean;
  error: string | null;
};

export function initialAppSettingsContext(
  languageCodes = getLocales().map(({ languageCode }) => languageCode),
): AppSettingsContext {
  return {
    locale: appLocaleForLanguageCodes(languageCodes),
    emotionLabelMode: EMOTION_LABEL_MODES.BOTH,
    onboardingCompleted: false,
    appVersion: Constants.expoConfig?.version ?? null,
    updateChannel: Updates.channel,
    gitCommit: typeof configuredGitCommit === 'string' ? configuredGitCommit : null,
    hydrated: false,
    error: null,
  };
}

export function createAppSettingsStore(
  initialContext = initialAppSettingsContext(),
) {
  return createStore({
    schemas: {
      context: Schema.standardSchemaV1(Schema.Struct({
        locale: AppLocaleSchema,
        emotionLabelMode: EmotionLabelModeSchema,
        onboardingCompleted: Schema.Boolean,
        appVersion: Schema.NullOr(Schema.String),
        updateChannel: Schema.NullOr(Schema.String),
        gitCommit: Schema.NullOr(Schema.String),
        hydrated: Schema.Boolean,
        error: Schema.NullOr(Schema.String),
      })),
      events: {
        languageChanged: Schema.standardSchemaV1(Schema.Struct({ locale: AppLocaleSchema })),
        emotionLabelModeChanged: Schema.standardSchemaV1(
          Schema.Struct({ mode: EmotionLabelModeSchema }),
        ),
        onboardingCompletedChanged: Schema.standardSchemaV1(
          Schema.Struct({ completed: Schema.Boolean }),
        ),
        hydrated: Schema.standardSchemaV1(Schema.Struct({ settings: AppSettingsSchema })),
        hydrationFailed: Schema.standardSchemaV1(Schema.Struct({ message: Schema.String })),
        persistenceFailed: Schema.standardSchemaV1(Schema.Struct({ message: Schema.String })),
      },
    },
    context: initialContext,
    on: {
      languageChanged: (context, event) => ({ ...context, locale: event.locale, error: null }),
      emotionLabelModeChanged: (context, event) => ({
        ...context,
        emotionLabelMode: event.mode,
        error: null,
      }),
      onboardingCompletedChanged: (context, event) => ({
        ...context,
        onboardingCompleted: event.completed,
        error: null,
      }),
      hydrated: (context, event) => ({
        ...context,
        ...event.settings,
        hydrated: true,
        error: null,
      }),
      hydrationFailed: (context, event) => ({
        ...context,
        hydrated: true,
        error: event.message,
      }),
      persistenceFailed: (context, event) => ({ ...context, error: event.message }),
    },
  });
}
