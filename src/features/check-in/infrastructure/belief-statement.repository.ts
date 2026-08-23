import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { SurrealRecordId } from 'react-native-surrealdb';
import assert from '@/assert';

import {
  BELIEF_STATEMENT_TABLE,
  CHECK_IN_TABLE,
} from '@/constants';

import {
  BeliefStatementArchiveTimestamp,
  BeliefStatementText,
  BeliefStatementSchema,
  BuiltInBeliefStatementSchema,
  CustomBeliefStatementSchema,
  type BeliefSystemId,
  type BeliefStatement,
  type CustomBeliefStatement,
} from '../domain/belief-statement';
import { CheckInId } from '../domain/check-in';
import { queryDatabase } from './surrealdb.database';

export class BeliefStatementStorageError extends Schema.TaggedError<BeliefStatementStorageError>()(
  'BeliefStatementStorageError',
  {
    operation: Schema.Literal('read', 'write', 'delete'),
    cause: Schema.Defect,
  },
) {}

export class BeliefStatementDataError extends Schema.TaggedError<BeliefStatementDataError>()(
  'BeliefStatementDataError',
  {
    operation: Schema.Literal('decode', 'encode'),
    cause: Schema.Defect,
  },
) {}

const SurrealNoneSchema = Schema.Struct({ kind: Schema.Literal('none') });
const CustomBeliefStatementDatabaseSchema = Schema.Struct({
  kind: CustomBeliefStatementSchema.fields.kind,
  beliefSystemId: CustomBeliefStatementSchema.fields.beliefSystemId,
  harmfulStatement: CustomBeliefStatementSchema.fields.harmfulStatement,
  guidingStatement: Schema.optional(Schema.Union(
    BeliefStatementText,
    SurrealNoneSchema,
  )),
  archivedAt: Schema.optional(Schema.Union(
    BeliefStatementArchiveTimestamp,
    SurrealNoneSchema,
  )),
});
const BeliefStatementDatabaseListSchema = Schema.Array(Schema.Union(
  BuiltInBeliefStatementSchema,
  CustomBeliefStatementDatabaseSchema,
));

function beliefStatementFromDatabase(
  statement: typeof BeliefStatementDatabaseListSchema.Type[number],
): BeliefStatement {
  assert(statement.beliefSystemId.length > 0, 'Stored belief must have an identifier.');
  assert(statement.kind === 'built-in' || statement.kind === 'custom', 'Stored belief kind must be supported.');
  if (statement.kind === 'built-in') return statement;
  const { guidingStatement, archivedAt, ...custom } = statement;
  return CustomBeliefStatementSchema.make({
    ...custom,
    ...(typeof guidingStatement === 'string' ? { guidingStatement } : {}),
    ...(typeof archivedAt === 'string' ? { archivedAt } : {}),
  });
}

export const loadBeliefStatements = Effect.tryPromise({
  try: () => queryDatabase({
    surql: `SELECT kind, statementId AS beliefSystemId, harmfulStatement, guidingStatement, archivedAt FROM ${BELIEF_STATEMENT_TABLE}`,
  }),
  catch: (cause) => BeliefStatementStorageError.make({ operation: 'read', cause }),
}).pipe(
  Effect.flatMap((statements) => Schema.decodeUnknown(BeliefStatementDatabaseListSchema)(
    statements[0]?.value ?? [],
  ).pipe(
    Effect.mapError((cause) => BeliefStatementDataError.make({
      operation: 'decode',
      cause,
    })),
    Effect.map((decoded) => decoded.map(beliefStatementFromDatabase)),
  )),
  Effect.withSpan('BeliefStatementRepository.load'),
);

export const persistBeliefStatement = Effect.fn(
  'BeliefStatementRepository.persist',
)((statement: BeliefStatement) => (
  Schema.encode(BeliefStatementSchema)(statement).pipe(
    Effect.mapError((cause) => BeliefStatementDataError.make({
      operation: 'encode',
      cause,
    })),
    Effect.flatMap((encoded) => Effect.tryPromise({
      try: async () => {
        await queryDatabase({
          surql: 'UPSERT $record CONTENT $statement',
          variables: {
            record: new SurrealRecordId(
              `${BELIEF_STATEMENT_TABLE}:${statement.beliefSystemId}`,
            ),
            statement: {
              ...encoded,
              statementId: encoded.beliefSystemId,
            },
          },
        });
      },
      catch: (cause) => BeliefStatementStorageError.make({
        operation: 'write',
        cause,
      }),
    })),
    Effect.as(statement),
  )
));

export const deleteBeliefStatement = Effect.fn(
  'BeliefStatementRepository.delete',
)((beliefSystemId: BeliefSystemId) => (
  Effect.tryPromise({
    try: async () => {
      await queryDatabase({
        surql: 'DELETE $record',
        variables: {
          record: new SurrealRecordId(
            `${BELIEF_STATEMENT_TABLE}:${beliefSystemId}`,
          ),
        },
      });
    },
    catch: (cause) => BeliefStatementStorageError.make({
      operation: 'delete',
      cause,
    }),
  })
));

const BeliefStatementReferenceListSchema = Schema.Array(CheckInId);

const isBeliefStatementReferenced = Effect.fn(
  'BeliefStatementRepository.isReferenced',
)((beliefSystemId: CustomBeliefStatement['beliefSystemId']) => (
  Effect.tryPromise({
    try: () => queryDatabase({
      surql: `SELECT VALUE checkInId FROM ${CHECK_IN_TABLE} WHERE beliefSystemId = $beliefSystemId LIMIT 1`,
      variables: { beliefSystemId },
    }),
    catch: (cause) => BeliefStatementStorageError.make({
      operation: 'read',
      cause,
    }),
  }).pipe(
    Effect.flatMap((results) => Schema.decodeUnknown(BeliefStatementReferenceListSchema)(
      results[0]?.value ?? [],
    ).pipe(
      Effect.mapError((cause) => BeliefStatementDataError.make({
        operation: 'decode',
        cause,
      })),
    )),
    Effect.map((references) => references.length > 0),
  )
));

export const retireCustomBeliefStatement = Effect.fn(
  'BeliefStatementRepository.retireCustom',
)(({
  archivedAt,
  statement,
}: {
  archivedAt: BeliefStatementArchiveTimestamp;
  statement: CustomBeliefStatement;
}) => (
  isBeliefStatementReferenced(statement.beliefSystemId).pipe(
    Effect.flatMap((referenced) => {
      assert(statement.kind === 'custom', 'Only custom beliefs can be retired.');
      assert(archivedAt.length > 0, 'Retired beliefs require an archive timestamp.');
      if (!referenced) {
        return deleteBeliefStatement(statement.beliefSystemId).pipe(
          Effect.as<CustomBeliefStatement | null>(null),
        );
      }
      const archived = CustomBeliefStatementSchema.make({
        ...statement,
        archivedAt,
      });
      return persistBeliefStatement(archived).pipe(Effect.as(archived));
    }),
  )
));
