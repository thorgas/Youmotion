import * as Schema from 'effect/Schema';

import { EMOTION_LABEL_MODES } from '@/constants';

export const EmotionLabelModeSchema = Schema.Literal(
  EMOTION_LABEL_MODES.EMOJI,
  EMOTION_LABEL_MODES.TEXT,
  EMOTION_LABEL_MODES.BOTH,
);

export type EmotionLabelMode = typeof EmotionLabelModeSchema.Type;
