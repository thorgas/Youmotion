import * as Schema from 'effect/Schema';

import {
  EMOTION_IDS,
  ONBOARDING_ENTRY_POINTS,
} from '@/constants';
import { EmotionSelectionSchema } from '@/features/check-in/domain/check-in';

export const OnboardingEntryPointSchema = Schema.Literal(
  ONBOARDING_ENTRY_POINTS.FIRST_LAUNCH,
  ONBOARDING_ENTRY_POINTS.SETTINGS,
);

export type OnboardingEntryPoint = typeof OnboardingEntryPointSchema.Type;

export const OnboardingSelectionSchema = Schema.NullOr(EmotionSelectionSchema);

export const onboardingExampleSelection = {
  emotionId: EMOTION_IDS.FEAR,
  intensity: 0.46,
  level: 3,
  color: '#766A9A',
} satisfies typeof EmotionSelectionSchema.Type;
