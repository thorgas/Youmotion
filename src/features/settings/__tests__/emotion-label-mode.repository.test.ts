import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Effect from 'effect/Effect';

import {
  EMOTION_LABEL_MODES,
  EMOTION_LABEL_MODE_STORAGE_KEY,
} from '@/constants';
import {
  loadEmotionLabelMode,
  persistEmotionLabelMode,
} from '../infrastructure/emotion-label-mode.repository';

describe('emotion label mode repository', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('defaults to emoji and persists another schema-valid mode', async () => {
    await expect(Effect.runPromise(loadEmotionLabelMode)).resolves.toBe(EMOTION_LABEL_MODES.EMOJI);

    await Effect.runPromise(persistEmotionLabelMode(EMOTION_LABEL_MODES.BOTH));

    await expect(AsyncStorage.getItem(EMOTION_LABEL_MODE_STORAGE_KEY)).resolves.toBe(EMOTION_LABEL_MODES.BOTH);
    await expect(Effect.runPromise(loadEmotionLabelMode)).resolves.toBe(EMOTION_LABEL_MODES.BOTH);
  });

  it('rejects an invalid persisted mode', async () => {
    await AsyncStorage.setItem(EMOTION_LABEL_MODE_STORAGE_KEY, 'pictures');

    const result = await Effect.runPromise(Effect.either(loadEmotionLabelMode));
    if (result._tag !== 'Left') throw new Error('Invalid stored modes must fail schema decoding.');
    expect(result.left).toMatchObject({ _tag: 'EmotionLabelModeDataError' });
  });
});
