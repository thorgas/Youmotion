import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import {
  EMOTION_LABEL_MODES,
  EMOTION_LABEL_MODE_STORAGE_KEY,
} from '@/constants';
import { EmotionLabelModeSchema, type EmotionLabelMode } from '../domain/emotion-label-mode';

export class EmotionLabelModeStorageError extends Schema.TaggedError<EmotionLabelModeStorageError>()(
  'EmotionLabelModeStorageError',
  {
    operation: Schema.Literal('read', 'write'),
    cause: Schema.Defect,
  },
) {}

export class EmotionLabelModeDataError extends Schema.TaggedError<EmotionLabelModeDataError>()(
  'EmotionLabelModeDataError',
  {
    cause: Schema.Defect,
  },
) {}

export const loadEmotionLabelMode = Effect.tryPromise({
  try: () => AsyncStorage.getItem(EMOTION_LABEL_MODE_STORAGE_KEY),
  catch: (cause) => EmotionLabelModeStorageError.make({ operation: 'read', cause }),
}).pipe(
  Effect.flatMap((stored) => {
    if (stored === null) return Effect.succeed<EmotionLabelMode>(EMOTION_LABEL_MODES.EMOJI);
    return Schema.decodeUnknown(EmotionLabelModeSchema)(stored).pipe(
      Effect.mapError((cause) => EmotionLabelModeDataError.make({ cause })),
    );
  }),
  Effect.withSpan('EmotionLabelModeRepository.load'),
);

export const persistEmotionLabelMode = Effect.fn('EmotionLabelModeRepository.persist')((mode: EmotionLabelMode) => (
  Effect.tryPromise({
    try: () => AsyncStorage.setItem(EMOTION_LABEL_MODE_STORAGE_KEY, mode),
    catch: (cause) => EmotionLabelModeStorageError.make({ operation: 'write', cause }),
  })
));
