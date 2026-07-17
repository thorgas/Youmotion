import { createStore } from '@xstate/store';
import * as Schema from 'effect/Schema';

import { EMOTION_LABEL_MODES } from '@/constants';
import { EmotionLabelModeSchema, type EmotionLabelMode } from '../domain/emotion-label-mode';

const initialContext = {
  mode: EMOTION_LABEL_MODES.EMOJI,
  hydrated: false,
  error: null,
} satisfies {
  mode: EmotionLabelMode;
  hydrated: boolean;
  error: string | null;
};

export const emotionLabelModeStore = createStore({
  schemas: {
    context: Schema.standardSchemaV1(Schema.Struct({
      mode: EmotionLabelModeSchema,
      hydrated: Schema.Boolean,
      error: Schema.NullOr(Schema.String),
    })),
    events: {
      changed: Schema.standardSchemaV1(Schema.Struct({ mode: EmotionLabelModeSchema })),
      hydrated: Schema.standardSchemaV1(Schema.Struct({ mode: EmotionLabelModeSchema })),
      hydrationFailed: Schema.standardSchemaV1(Schema.Struct({ message: Schema.String })),
      persistenceFailed: Schema.standardSchemaV1(Schema.Struct({ message: Schema.String })),
    },
  },
  context: initialContext,
  on: {
    changed: (context, event) => ({ ...context, mode: event.mode, error: null }),
    hydrated: (_context, event) => ({ mode: event.mode, hydrated: true, error: null }),
    hydrationFailed: (context, event) => ({ ...context, hydrated: true, error: event.message }),
    persistenceFailed: (context, event) => ({ ...context, error: event.message }),
  },
});
