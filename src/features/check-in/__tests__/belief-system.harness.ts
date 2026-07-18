import { describe, expect, it } from 'react-native-harness';

import {
  BELIEF_SYSTEM_IDS,
  EMOTION_IDS,
} from '@/constants';
import {
  beliefSystemIds,
  recommendedBeliefSystemIds,
} from '../domain/belief-system';

describe('belief-system recommendations on the native runtime', () => {
  it('ranks the complete catalog without engine-specific array methods', () => {
    const recommendations = recommendedBeliefSystemIds({
      emotionId: EMOTION_IDS.LOVE,
      history: [],
    });

    expect(recommendations).toHaveLength(beliefSystemIds.length);
    expect(recommendations[0]).toBe(BELIEF_SYSTEM_IDS.LOVE_REQUIRES_CONFORMITY);
  });
});
