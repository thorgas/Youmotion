import * as Schema from 'effect/Schema';

import { AppLocaleSchema } from '@/localization/app-locale';
import { EmotionLabelModeSchema } from '@/preferences/emotion-label-mode';

export const AppSettingsSchema = Schema.Struct({
  locale: AppLocaleSchema,
  emotionLabelMode: EmotionLabelModeSchema,
  onboardingCompleted: Schema.Boolean,
});

export type AppSettings = typeof AppSettingsSchema.Type;
