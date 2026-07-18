import * as Schema from 'effect/Schema';

import { EMOTION_IDS, BELIEF_SYSTEM_IDS } from '@/constants';

import type { CheckIn, EmotionId } from './check-in';

export const BeliefSystemId = Schema.Literal(
  BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING,
  BELIEF_SYSTEM_IDS.NO_MISTAKES,
  BELIEF_SYSTEM_IDS.RESPONSIBLE_FOR_EVERYTHING,
  BELIEF_SYSTEM_IDS.DO_EVERYTHING_ALONE,
  BELIEF_SYSTEM_IDS.PERFECT_EVERYTHING,
  BELIEF_SYSTEM_IDS.THERE_FOR_OTHERS,
  BELIEF_SYSTEM_IDS.PERFECT_EXPECT_OTHERS,
  BELIEF_SYSTEM_IDS.LOVE_REQUIRES_CONFORMITY,
  BELIEF_SYSTEM_IDS.ALWAYS_CONSIDERATE,
  BELIEF_SYSTEM_IDS.MUST_ADAPT,
  BELIEF_SYSTEM_IDS.LOVED_BY_EVERYONE,
  BELIEF_SYSTEM_IDS.CANNOT_BURDEN_OTHERS,
  BELIEF_SYSTEM_IDS.INFERIOR_TO_OTHERS,
  BELIEF_SYSTEM_IDS.OTHERS_ARE_BETTER,
  BELIEF_SYSTEM_IDS.MUST_NOT_BE_ANGRY,
  BELIEF_SYSTEM_IDS.MUST_STAY_IN_CONTROL,
  BELIEF_SYSTEM_IDS.MUST_NOT_BE_CENTER,
  BELIEF_SYSTEM_IDS.MUST_NOT_SAY_NO,
);
export type BeliefSystemId = typeof BeliefSystemId.Type;

export const beliefSystemIds: readonly BeliefSystemId[] = [
  BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING,
  BELIEF_SYSTEM_IDS.NO_MISTAKES,
  BELIEF_SYSTEM_IDS.RESPONSIBLE_FOR_EVERYTHING,
  BELIEF_SYSTEM_IDS.DO_EVERYTHING_ALONE,
  BELIEF_SYSTEM_IDS.PERFECT_EVERYTHING,
  BELIEF_SYSTEM_IDS.THERE_FOR_OTHERS,
  BELIEF_SYSTEM_IDS.PERFECT_EXPECT_OTHERS,
  BELIEF_SYSTEM_IDS.LOVE_REQUIRES_CONFORMITY,
  BELIEF_SYSTEM_IDS.ALWAYS_CONSIDERATE,
  BELIEF_SYSTEM_IDS.MUST_ADAPT,
  BELIEF_SYSTEM_IDS.LOVED_BY_EVERYONE,
  BELIEF_SYSTEM_IDS.CANNOT_BURDEN_OTHERS,
  BELIEF_SYSTEM_IDS.INFERIOR_TO_OTHERS,
  BELIEF_SYSTEM_IDS.OTHERS_ARE_BETTER,
  BELIEF_SYSTEM_IDS.MUST_NOT_BE_ANGRY,
  BELIEF_SYSTEM_IDS.MUST_STAY_IN_CONTROL,
  BELIEF_SYSTEM_IDS.MUST_NOT_BE_CENTER,
  BELIEF_SYSTEM_IDS.MUST_NOT_SAY_NO,
];

const defaultsByEmotion = new Map<EmotionId, readonly BeliefSystemId[]>([
  [EMOTION_IDS.JOY, [
    BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING,
    BELIEF_SYSTEM_IDS.PERFECT_EVERYTHING,
    BELIEF_SYSTEM_IDS.LOVED_BY_EVERYONE,
    BELIEF_SYSTEM_IDS.MUST_NOT_BE_CENTER,
  ]],
  [EMOTION_IDS.LOVE, [
    BELIEF_SYSTEM_IDS.LOVE_REQUIRES_CONFORMITY,
    BELIEF_SYSTEM_IDS.LOVED_BY_EVERYONE,
    BELIEF_SYSTEM_IDS.THERE_FOR_OTHERS,
    BELIEF_SYSTEM_IDS.ALWAYS_CONSIDERATE,
    BELIEF_SYSTEM_IDS.MUST_ADAPT,
    BELIEF_SYSTEM_IDS.MUST_NOT_SAY_NO,
    BELIEF_SYSTEM_IDS.CANNOT_BURDEN_OTHERS,
  ]],
  [EMOTION_IDS.SHAME, [
    BELIEF_SYSTEM_IDS.NO_MISTAKES,
    BELIEF_SYSTEM_IDS.PERFECT_EVERYTHING,
    BELIEF_SYSTEM_IDS.INFERIOR_TO_OTHERS,
    BELIEF_SYSTEM_IDS.OTHERS_ARE_BETTER,
    BELIEF_SYSTEM_IDS.CANNOT_BURDEN_OTHERS,
    BELIEF_SYSTEM_IDS.MUST_NOT_BE_CENTER,
    BELIEF_SYSTEM_IDS.LOVE_REQUIRES_CONFORMITY,
  ]],
  [EMOTION_IDS.DISGUST, [
    BELIEF_SYSTEM_IDS.PERFECT_EXPECT_OTHERS,
    BELIEF_SYSTEM_IDS.PERFECT_EVERYTHING,
    BELIEF_SYSTEM_IDS.MUST_STAY_IN_CONTROL,
    BELIEF_SYSTEM_IDS.MUST_NOT_BE_ANGRY,
  ]],
  [EMOTION_IDS.SADNESS, [
    BELIEF_SYSTEM_IDS.OTHERS_ARE_BETTER,
    BELIEF_SYSTEM_IDS.INFERIOR_TO_OTHERS,
    BELIEF_SYSTEM_IDS.LOVED_BY_EVERYONE,
    BELIEF_SYSTEM_IDS.CANNOT_BURDEN_OTHERS,
    BELIEF_SYSTEM_IDS.LOVE_REQUIRES_CONFORMITY,
    BELIEF_SYSTEM_IDS.MUST_ADAPT,
  ]],
  [EMOTION_IDS.ANGER, [
    BELIEF_SYSTEM_IDS.RESPONSIBLE_FOR_EVERYTHING,
    BELIEF_SYSTEM_IDS.THERE_FOR_OTHERS,
    BELIEF_SYSTEM_IDS.MUST_NOT_SAY_NO,
    BELIEF_SYSTEM_IDS.MUST_NOT_BE_ANGRY,
    BELIEF_SYSTEM_IDS.PERFECT_EXPECT_OTHERS,
    BELIEF_SYSTEM_IDS.MUST_STAY_IN_CONTROL,
    BELIEF_SYSTEM_IDS.ALWAYS_CONSIDERATE,
  ]],
  [EMOTION_IDS.FEAR, [
    BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING,
    BELIEF_SYSTEM_IDS.NO_MISTAKES,
    BELIEF_SYSTEM_IDS.RESPONSIBLE_FOR_EVERYTHING,
    BELIEF_SYSTEM_IDS.DO_EVERYTHING_ALONE,
    BELIEF_SYSTEM_IDS.PERFECT_EVERYTHING,
    BELIEF_SYSTEM_IDS.MUST_STAY_IN_CONTROL,
    BELIEF_SYSTEM_IDS.CANNOT_BURDEN_OTHERS,
    BELIEF_SYSTEM_IDS.MUST_ADAPT,
  ]],
]);

function usageCount({
  emotionId,
  history,
  beliefSystemId,
}: {
  emotionId: EmotionId;
  history: readonly CheckIn[];
  beliefSystemId: BeliefSystemId;
}) {
  return history.filter((entry) => (
    entry.emotionId === emotionId && entry.beliefSystemId === beliefSystemId
  )).length;
}

function compareBeliefSystems({
  defaults,
  emotionId,
  history,
  left,
  right,
}: {
  defaults: readonly BeliefSystemId[];
  emotionId: EmotionId;
  history: readonly CheckIn[];
  left: BeliefSystemId;
  right: BeliefSystemId;
}) {
  const usageDifference = usageCount({ emotionId, history, beliefSystemId: right })
    - usageCount({ emotionId, history, beliefSystemId: left });
  if (usageDifference !== 0) return usageDifference;
  const leftDefault = defaults.indexOf(left);
  const rightDefault = defaults.indexOf(right);
  const leftRank = leftDefault === -1 ? beliefSystemIds.length : leftDefault;
  const rightRank = rightDefault === -1 ? beliefSystemIds.length : rightDefault;
  if (leftRank !== rightRank) return leftRank - rightRank;
  return beliefSystemIds.indexOf(left) - beliefSystemIds.indexOf(right);
}

export function recommendedBeliefSystemIds({
  emotionId,
  history,
}: {
  emotionId: EmotionId;
  history: readonly CheckIn[];
}) {
  const defaults = defaultsByEmotion.get(emotionId) ?? [];
  return beliefSystemIds.reduce<BeliefSystemId[]>((ranked, beliefSystemId) => {
    const insertionIndex = ranked.findIndex((rankedBeliefSystemId) => (
      compareBeliefSystems({
        defaults,
        emotionId,
        history,
        left: beliefSystemId,
        right: rankedBeliefSystemId,
      }) < 0
    ));
    if (insertionIndex === -1) return ranked.concat(beliefSystemId);
    return ranked
      .slice(0, insertionIndex)
      .concat(beliefSystemId, ranked.slice(insertionIndex));
  }, []);
}
