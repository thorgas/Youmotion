import {
  EMOTION_IDS,
  BELIEF_SYSTEM_IDS,
} from '@/constants';

import {
  CheckInId,
  CheckInTimestamp,
  type CheckIn,
} from '../domain/check-in';
import {
  beliefSystemIds,
  recommendedBeliefSystemIds,
  type BeliefSystemId,
} from '../domain/belief-system';

function checkIn({
  id,
  emotionId,
  beliefSystemId,
}: {
  id: string;
  emotionId: CheckIn['emotionId'];
  beliefSystemId: BeliefSystemId;
}): CheckIn {
  return {
    id: CheckInId.make(id),
    createdAt: CheckInTimestamp.make('2026-07-18T12:00:00.000Z'),
    emotionId,
    intensity: 0.5,
    level: 2,
    note: '',
    beliefSystemId,
  };
}

describe('core belief recommendations', () => {
  it('keeps all supplied beliefs available exactly once', () => {
    expect(beliefSystemIds).toHaveLength(22);
    expect(new Set(beliefSystemIds).size).toBe(22);
  });

  it('uses a many-to-many emotion mapping for the initial ranking', () => {
    const catalogBeforeRanking = [...beliefSystemIds];
    const love = recommendedBeliefSystemIds({ emotionId: EMOTION_IDS.LOVE, history: [] });
    const sadness = recommendedBeliefSystemIds({ emotionId: EMOTION_IDS.SADNESS, history: [] });

    expect(love.slice(0, 7)).toContain(BELIEF_SYSTEM_IDS.LOVE_REQUIRES_CONFORMITY);
    expect(sadness.slice(0, 6)).toContain(BELIEF_SYSTEM_IDS.LOVE_REQUIRES_CONFORMITY);
    expect(beliefSystemIds).toEqual(catalogBeforeRanking);
  });

  it('promotes beliefs previously attached to the same emotion', () => {
    const history = [
      checkIn({
        id: 'anger-one',
        emotionId: EMOTION_IDS.ANGER,
        beliefSystemId: BELIEF_SYSTEM_IDS.MUST_STAY_IN_CONTROL,
      }),
      checkIn({
        id: 'anger-two',
        emotionId: EMOTION_IDS.ANGER,
        beliefSystemId: BELIEF_SYSTEM_IDS.MUST_STAY_IN_CONTROL,
      }),
      checkIn({
        id: 'fear-one',
        emotionId: EMOTION_IDS.FEAR,
        beliefSystemId: BELIEF_SYSTEM_IDS.NO_MISTAKES,
      }),
    ];

    expect(recommendedBeliefSystemIds({
      emotionId: EMOTION_IDS.ANGER,
      history,
    })[0]).toBe(BELIEF_SYSTEM_IDS.MUST_STAY_IN_CONTROL);
  });
});
