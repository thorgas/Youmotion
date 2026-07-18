import { BELIEF_SYSTEM_IDS, EMOTION_IDS } from '@/constants';
import type { CheckIn, EmotionId } from './check-in';
import {
  customBeliefSystemIds,
  type BeliefStatement,
  type BeliefSystemId,
  type BuiltInBeliefSystemId,
} from './belief-statement';

export const beliefSystemIds: readonly BuiltInBeliefSystemId[] = [
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
  BELIEF_SYSTEM_IDS.LOVE_REQUIRES_SUCCESS, BELIEF_SYSTEM_IDS.LOVE_MAKES_VULNERABLE,
  BELIEF_SYSTEM_IDS.LOVE_REQUIRES_HELPING, BELIEF_SYSTEM_IDS.ANGER_LOOKS_STUPID,
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
    BELIEF_SYSTEM_IDS.LOVE_REQUIRES_SUCCESS,
    BELIEF_SYSTEM_IDS.LOVE_MAKES_VULNERABLE,
    BELIEF_SYSTEM_IDS.LOVE_REQUIRES_HELPING,
  ]],
  [EMOTION_IDS.SHAME, [
    BELIEF_SYSTEM_IDS.NO_MISTAKES,
    BELIEF_SYSTEM_IDS.PERFECT_EVERYTHING,
    BELIEF_SYSTEM_IDS.INFERIOR_TO_OTHERS,
    BELIEF_SYSTEM_IDS.OTHERS_ARE_BETTER,
    BELIEF_SYSTEM_IDS.CANNOT_BURDEN_OTHERS,
    BELIEF_SYSTEM_IDS.MUST_NOT_BE_CENTER,
    BELIEF_SYSTEM_IDS.LOVE_REQUIRES_CONFORMITY,
    BELIEF_SYSTEM_IDS.LOVE_REQUIRES_SUCCESS,
    BELIEF_SYSTEM_IDS.ANGER_LOOKS_STUPID,
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
    BELIEF_SYSTEM_IDS.LOVE_MAKES_VULNERABLE,
  ]],
  [EMOTION_IDS.ANGER, [
    BELIEF_SYSTEM_IDS.RESPONSIBLE_FOR_EVERYTHING,
    BELIEF_SYSTEM_IDS.THERE_FOR_OTHERS,
    BELIEF_SYSTEM_IDS.MUST_NOT_SAY_NO,
    BELIEF_SYSTEM_IDS.MUST_NOT_BE_ANGRY,
    BELIEF_SYSTEM_IDS.PERFECT_EXPECT_OTHERS,
    BELIEF_SYSTEM_IDS.MUST_STAY_IN_CONTROL,
    BELIEF_SYSTEM_IDS.ALWAYS_CONSIDERATE,
    BELIEF_SYSTEM_IDS.LOVE_REQUIRES_HELPING,
    BELIEF_SYSTEM_IDS.ANGER_LOOKS_STUPID,
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
    BELIEF_SYSTEM_IDS.LOVE_REQUIRES_SUCCESS,
    BELIEF_SYSTEM_IDS.LOVE_MAKES_VULNERABLE,
    BELIEF_SYSTEM_IDS.LOVE_REQUIRES_HELPING,
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
  catalog,
  defaults,
  emotionId,
  history,
  left,
  right,
}: {
  catalog: readonly BeliefSystemId[];
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
  const leftRank = leftDefault === -1 ? catalog.length : leftDefault;
  const rightRank = rightDefault === -1 ? catalog.length : rightDefault;
  if (leftRank !== rightRank) return leftRank - rightRank;
  return catalog.indexOf(left) - catalog.indexOf(right);
}

export function recommendedBeliefSystemIds({
  emotionId,
  history,
  statements = [],
}: {
  emotionId: EmotionId;
  history: readonly CheckIn[];
  statements?: readonly BeliefStatement[];
}) {
  const defaults = defaultsByEmotion.get(emotionId) ?? [];
  const catalog: readonly BeliefSystemId[] = [
    ...beliefSystemIds,
    ...customBeliefSystemIds(statements),
  ];
  return catalog.reduce<BeliefSystemId[]>((ranked, beliefSystemId) => {
    const insertionIndex = ranked.findIndex((rankedBeliefSystemId) => (
      compareBeliefSystems({
        catalog,
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
