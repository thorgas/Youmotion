import { createStore } from '@xstate/store';
import * as Schema from 'effect/Schema';

import {
  APP_LOCALES,
  EMOTION_LABEL_MODES,
} from '@/constants';
import { AppLocaleSchema } from '../domain/app-locale';
import { AppSettingsSchema, type AppSettings } from '../domain/app-settings';
import { EmotionLabelModeSchema } from '../domain/emotion-label-mode';

const initialContext = {
  locale: APP_LOCALES.ENGLISH,
  emotionLabelMode: EMOTION_LABEL_MODES.EMOJI,
  hydrated: false,
  error: null,
} satisfies AppSettings & {
  hydrated: boolean;
  error: string | null;
};

export const appSettingsStore = createStore({
  schemas: {
    context: Schema.standardSchemaV1(Schema.Struct({
      locale: AppLocaleSchema,
      emotionLabelMode: EmotionLabelModeSchema,
      hydrated: Schema.Boolean,
      error: Schema.NullOr(Schema.String),
    })),
    events: {
      languageChanged: Schema.standardSchemaV1(Schema.Struct({ locale: AppLocaleSchema })),
      emotionLabelModeChanged: Schema.standardSchemaV1(
        Schema.Struct({ mode: EmotionLabelModeSchema }),
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
    hydrated: (_context, event) => ({
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
