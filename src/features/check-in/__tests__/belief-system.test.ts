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
  CustomBeliefSystemId,
  type BeliefStatement,
  type BeliefSystemId,
} from '../domain/belief-statement';
import {
  beliefSystemIds,
  recommendedBeliefSystemIds,
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

  it('adds personal beliefs to the catalog and promotes them after use', () => {
    const beliefSystemId = CustomBeliefSystemId.make('custom-rest-is-safe');
    const statements = [{
      kind: 'custom',
      beliefSystemId,
      harmfulStatement: 'I must earn every pause.',
      guidingStatement: 'Rest is part of a full life.',
    }] satisfies readonly BeliefStatement[];
    const history = [
      checkIn({
        id: 'custom-joy',
        emotionId: EMOTION_IDS.JOY,
        beliefSystemId,
      }),
    ];

    const recommendations = recommendedBeliefSystemIds({
      emotionId: EMOTION_IDS.JOY,
      history,
      statements,
    });

    expect(recommendations).toHaveLength(beliefSystemIds.length + 1);
    expect(recommendations[0]).toBe(beliefSystemId);
  });
});
