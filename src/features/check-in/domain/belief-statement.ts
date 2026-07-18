import * as Schema from 'effect/Schema';

import {
  BELIEF_SYSTEM_IDS,
  CUSTOM_BELIEF_SYSTEM_ID_PREFIX,
  MAX_BELIEF_STATEMENT_LENGTH,
} from '@/constants';

export const BuiltInBeliefSystemId = Schema.Literal(
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
  BELIEF_SYSTEM_IDS.LOVE_REQUIRES_SUCCESS,
  BELIEF_SYSTEM_IDS.LOVE_MAKES_VULNERABLE,
  BELIEF_SYSTEM_IDS.LOVE_REQUIRES_HELPING,
  BELIEF_SYSTEM_IDS.ANGER_LOOKS_STUPID,
);
export type BuiltInBeliefSystemId = typeof BuiltInBeliefSystemId.Type;

export const CustomBeliefSystemId = Schema.String.pipe(
  Schema.startsWith(CUSTOM_BELIEF_SYSTEM_ID_PREFIX),
  Schema.minLength(CUSTOM_BELIEF_SYSTEM_ID_PREFIX.length + 1),
  Schema.brand('CustomBeliefSystemId'),
);
export type CustomBeliefSystemId = typeof CustomBeliefSystemId.Type;

export const BeliefSystemId = Schema.Union(
  BuiltInBeliefSystemId,
  CustomBeliefSystemId,
);
export type BeliefSystemId = typeof BeliefSystemId.Type;

export const BeliefStatementText = Schema.String.pipe(
  Schema.minLength(1),
  Schema.maxLength(MAX_BELIEF_STATEMENT_LENGTH),
);

export const CustomBeliefStatementSchema = Schema.Struct({
  kind: Schema.Literal('custom'),
  beliefSystemId: CustomBeliefSystemId,
  harmfulStatement: BeliefStatementText,
  guidingStatement: Schema.optional(BeliefStatementText),
});

export const BuiltInBeliefStatementSchema = Schema.Struct({
  kind: Schema.Literal('built-in'),
  beliefSystemId: BuiltInBeliefSystemId,
  guidingStatement: BeliefStatementText,
});

export const BeliefStatementSchema = Schema.Union(
  CustomBeliefStatementSchema,
  BuiltInBeliefStatementSchema,
);
export type BeliefStatement = typeof BeliefStatementSchema.Type;

export const BeliefStatementListSchema = Schema.Array(BeliefStatementSchema);

export function createCustomBeliefSystemId({
  nonce,
  timestamp,
}: {
  nonce: string;
  timestamp: number;
}) {
  return CustomBeliefSystemId.make(
    `${CUSTOM_BELIEF_SYSTEM_ID_PREFIX}${timestamp}-${nonce}`,
  );
}

export function isCustomBeliefSystemId(
  beliefSystemId: BeliefSystemId,
): beliefSystemId is CustomBeliefSystemId {
  return beliefSystemId.startsWith(CUSTOM_BELIEF_SYSTEM_ID_PREFIX);
}

export function beliefStatementForId({
  beliefSystemId,
  statements,
}: {
  beliefSystemId: BeliefSystemId;
  statements: readonly BeliefStatement[];
}) {
  return statements.find((statement) => statement.beliefSystemId === beliefSystemId);
}

export function customBeliefSystemIds(
  statements: readonly BeliefStatement[],
): readonly CustomBeliefSystemId[] {
  return statements
    .filter((statement) => statement.kind === 'custom')
    .map((statement) => statement.beliefSystemId);
}

export function recordBeliefStatement({
  statement,
  statements,
}: {
  statement: BeliefStatement;
  statements: readonly BeliefStatement[];
}) {
  const existing = statements.some(
    (candidate) => candidate.beliefSystemId === statement.beliefSystemId,
  );
  if (!existing) return statements.concat(statement);
  return statements.map((candidate) => (
    candidate.beliefSystemId === statement.beliefSystemId ? statement : candidate
  ));
}
