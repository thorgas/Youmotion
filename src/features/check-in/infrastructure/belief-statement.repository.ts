import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { SurrealRecordId } from 'react-native-surrealdb';

import {
  BELIEF_STATEMENT_TABLE,
  CHECK_IN_TABLE,
} from '@/constants';

import {
  BeliefStatementArchiveTimestamp,
  BeliefStatementListSchema,
  BeliefStatementSchema,
  CustomBeliefStatementSchema,
  type BeliefSystemId,
  type BeliefStatement,
  type CustomBeliefStatement,
} from '../domain/belief-statement';
import { CheckInId } from '../domain/check-in';
import { getDatabase } from './surrealdb.database';

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

export const loadBeliefStatements = Effect.tryPromise({
  try: async () => {
    const database = await getDatabase();
    return database.query<unknown>(
      `SELECT kind, statementId AS beliefSystemId, harmfulStatement, guidingStatement, archivedAt FROM ${BELIEF_STATEMENT_TABLE}`,
    );
  },
  catch: (cause) => BeliefStatementStorageError.make({ operation: 'read', cause }),
}).pipe(
  Effect.flatMap((statements) => Schema.decodeUnknown(BeliefStatementListSchema)(
    statements[0]?.value ?? [],
  ).pipe(
    Effect.mapError((cause) => BeliefStatementDataError.make({
      operation: 'decode',
      cause,
    })),
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
        const database = await getDatabase();
        await database.query(
          'UPSERT $record CONTENT $statement',
          {
            record: new SurrealRecordId(
              `${BELIEF_STATEMENT_TABLE}:${statement.beliefSystemId}`,
            ),
            statement: {
              ...encoded,
              statementId: encoded.beliefSystemId,
            },
          },
        );
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
      const database = await getDatabase();
      await database.query(
        'DELETE $record',
        {
          record: new SurrealRecordId(
            `${BELIEF_STATEMENT_TABLE}:${beliefSystemId}`,
          ),
        },
      );
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
    try: async () => {
      const database = await getDatabase();
      return database.query<unknown>(
        `SELECT VALUE checkInId FROM ${CHECK_IN_TABLE} WHERE beliefSystemId = $beliefSystemId LIMIT 1`,
        { beliefSystemId },
      );
    },
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
