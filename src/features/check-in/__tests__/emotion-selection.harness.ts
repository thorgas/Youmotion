import { describe, expect, it } from 'react-native-harness';

import { EMOTION_IDS } from '@/constants';
import { selectionFromPoint } from '../domain/emotion-selection';

describe('Gefühlspuls geometry on the native runtime', () => {
  it('selects the same emotion and clamps intensity across engines', () => {
    const selection = selectionFromPoint({
      point: { x: 100, y: 0 },
      center: { x: 100, y: 100 },
      maxRadius: 80,
    });
    expect(selection?.emotionId).toBe(EMOTION_IDS.JOY);
    expect(selection?.intensity).toBe(1);
  });
});
