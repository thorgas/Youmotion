import { fbs } from 'fbtee';
import assert from '@/assert';

import { BELIEF_SYSTEM_IDS } from '@/constants';

import {
  beliefStatementForId,
  type BeliefStatement,
  type BeliefSystemId,
} from '../domain/belief-statement';

type Copy = () => string;

const copyById = new Map<BeliefSystemId, Copy>([
  [BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING, () => String(fbs(
    'I always have to function.',
    'Negative core belief about always functioning',
  ))],
  [BELIEF_SYSTEM_IDS.NO_MISTAKES, () => String(fbs(
    'I must not make mistakes.',
    'Negative core belief about making no mistakes',
  ))],
  [BELIEF_SYSTEM_IDS.RESPONSIBLE_FOR_EVERYTHING, () => String(fbs(
    'I am responsible for everything.',
    'Negative core belief about total responsibility',
  ))],
  [BELIEF_SYSTEM_IDS.DO_EVERYTHING_ALONE, () => String(fbs(
    'I have to do everything alone.',
    'Negative core belief about doing everything alone',
  ))],
  [BELIEF_SYSTEM_IDS.PERFECT_EVERYTHING, () => String(fbs(
    'I must do everything perfectly.',
    'Negative core belief about perfection',
  ))],
  [BELIEF_SYSTEM_IDS.THERE_FOR_OTHERS, () => String(fbs(
    'I always have to be there for others.',
    'Negative core belief about always being there for others',
  ))],
  [BELIEF_SYSTEM_IDS.PERFECT_EXPECT_OTHERS, () => String(fbs(
    'I am perfect and expect the same from others.',
    'Negative core belief about expecting perfection',
  ))],
  [BELIEF_SYSTEM_IDS.LOVE_REQUIRES_CONFORMITY, () => String(fbs(
    'To be loved, I must be the way others want me to be.',
    'Negative core belief about changing oneself to be loved',
  ))],
  [BELIEF_SYSTEM_IDS.ALWAYS_CONSIDERATE, () => String(fbs(
    'I must always be considerate.',
    'Negative core belief about always being considerate',
  ))],
  [BELIEF_SYSTEM_IDS.MUST_ADAPT, () => String(fbs(
    'I have to adapt.',
    'Negative core belief about adapting oneself',
  ))],
  [BELIEF_SYSTEM_IDS.LOVED_BY_EVERYONE, () => String(fbs(
    'I want to be loved by everyone.',
    'Negative core belief about being loved by everyone',
  ))],
  [BELIEF_SYSTEM_IDS.CANNOT_BURDEN_OTHERS, () => String(fbs(
    'I cannot burden anyone with myself.',
    'Negative core belief about being a burden',
  ))],
  [BELIEF_SYSTEM_IDS.INFERIOR_TO_OTHERS, () => String(fbs(
    'I am uglier, less intelligent, or otherwise inferior to others.',
    'Negative core belief about being inferior to others',
  ))],
  [BELIEF_SYSTEM_IDS.OTHERS_ARE_BETTER, () => String(fbs(
    'Others are always better than me.',
    'Negative core belief about others being better',
  ))],
  [BELIEF_SYSTEM_IDS.MUST_NOT_BE_ANGRY, () => String(fbs(
    'I must not be angry.',
    'Negative core belief about suppressing anger',
  ))],
  [BELIEF_SYSTEM_IDS.MUST_STAY_IN_CONTROL, () => String(fbs(
    'I must never lose control.',
    'Negative core belief about never losing control',
  ))],
  [BELIEF_SYSTEM_IDS.MUST_NOT_BE_CENTER, () => String(fbs(
    'I must not be the center of attention.',
    'Negative core belief about avoiding attention',
  ))],
  [BELIEF_SYSTEM_IDS.MUST_NOT_SAY_NO, () => String(fbs(
    'I must never say no.',
    'Negative core belief about never saying no',
  ))],
  [BELIEF_SYSTEM_IDS.LOVE_REQUIRES_SUCCESS, () => String(fbs(
    'I am only loved when I am successful.',
    'Negative core belief about success being required for love',
  ))],
  [BELIEF_SYSTEM_IDS.LOVE_MAKES_VULNERABLE, () => String(fbs(
    'Love makes you weak or vulnerable.',
    'Negative core belief about love causing weakness or vulnerability',
  ))],
  [BELIEF_SYSTEM_IDS.LOVE_REQUIRES_HELPING, () => String(fbs(
    "If I don't help, I won't be loved.",
    'Negative core belief about helping being required for love',
  ))],
  [BELIEF_SYSTEM_IDS.ANGER_LOOKS_STUPID, () => String(fbs(
    'Being angry makes you look stupid.',
    'Negative core belief about anger looking stupid',
  ))],
]);

const _fallback = () => String(fbs('Core belief', 'Fallback label for a core belief'));

export function beliefSystemText(
  {
    id,
    statements = [],
  }: {
    id: BeliefSystemId;
    statements?: readonly BeliefStatement[];
  },
) {
  assert(id.length > 0, 'Belief copy requires an identifier.');
  assert(statements.every((statement) => statement.beliefSystemId.length > 0), 'Belief copy statements require identifiers.');
  const statement = beliefStatementForId({ beliefSystemId: id, statements });
  if (statement?.kind === 'custom') return statement.harmfulStatement;
  return copyById.get(id)?.() ?? _fallback();
}

export function guidingBeliefSystemText(
  {
    id,
    statements,
  }: {
    id: BeliefSystemId;
    statements: readonly BeliefStatement[];
  },
) {
  return beliefStatementForId({
    beliefSystemId: id,
    statements,
  })?.guidingStatement;
}

export const noBeliefSystemText = () => String(fbs(
  'Do not attach a core belief',
  'Picker option for attaching no core belief',
));

export const beliefSystemPickerAccessibilityLabel = () => String(fbs(
  'Optional core belief',
  'Accessibility label for the core belief picker',
));

export const customBeliefAccessibilityLabel = () => String(fbs(
  'Your own core belief',
  'Accessibility label for the personal core belief input',
));

export const customBeliefPlaceholder = () => String(fbs(
  'I always have to function.',
  'Placeholder example for a personal core belief',
));

export const guidingBeliefAccessibilityLabel = () => String(fbs(
  'Positive guiding belief',
  'Accessibility label for the positive guiding belief input',
));

export const guidingBeliefPlaceholder = () => String(fbs(
  'Write your new guiding belief here, for example: I may not function sometimes and I am still loved.',
  'Input placeholder instructing the user to write a compassionate positive guiding belief and providing an example',
));
