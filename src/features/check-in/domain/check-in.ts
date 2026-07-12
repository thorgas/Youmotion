import * as Schema from 'effect/Schema';

import { EMOTION_IDS, MAX_NOTE_LENGTH } from '@/constants';

export const EmotionId = Schema.Literal(
  EMOTION_IDS.JOY,
  EMOTION_IDS.LOVE,
  EMOTION_IDS.SHAME,
  EMOTION_IDS.DISGUST,
  EMOTION_IDS.SADNESS,
  EMOTION_IDS.ANGER,
  EMOTION_IDS.FEAR,
);
export type EmotionId = typeof EmotionId.Type;

export const CheckInId = Schema.String.pipe(Schema.brand('CheckInId'));
export type CheckInId = typeof CheckInId.Type;

export const CheckInTimestamp = Schema.String.pipe(Schema.brand('CheckInTimestamp'));
export type CheckInTimestamp = typeof CheckInTimestamp.Type;

export const EmotionSelectionSchema = Schema.Struct({
  emotionId: EmotionId,
  intensity: Schema.Number.pipe(Schema.between(0, 1)),
  level: Schema.Int.pipe(Schema.nonNegative()),
  color: Schema.String,
});
export type EmotionSelection = typeof EmotionSelectionSchema.Type;

export const CheckInSchema = Schema.Struct({
  id: CheckInId,
  createdAt: CheckInTimestamp,
  emotionId: EmotionId,
  intensity: Schema.Number.pipe(Schema.between(0, 1)),
  level: Schema.optional(Schema.Int.pipe(Schema.nonNegative())),
  note: Schema.String.pipe(Schema.maxLength(MAX_NOTE_LENGTH)),
});
export type CheckIn = typeof CheckInSchema.Type;

export const CheckInListSchema = Schema.Array(CheckInSchema);
export const CheckInListFromJson = Schema.parseJson(CheckInListSchema);
