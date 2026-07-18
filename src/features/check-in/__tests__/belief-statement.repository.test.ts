import * as Effect from 'effect/Effect';

import { BELIEF_SYSTEM_IDS } from '@/constants';
import {
  CustomBeliefSystemId,
  type BeliefStatement,
} from '../domain/belief-statement';
import {
  loadBeliefStatements,
  persistBeliefStatement,
} from '../infrastructure/belief-statement.repository';
import {
  failNextSurrealUpsert,
  mockSurrealDatabase,
  mockSurrealQuery,
  resetSurrealDatabaseMock,
} from '@/test-utils/surrealdb.repository.mock';

jest.mock('../infrastructure/surrealdb.database', () => ({
  getDatabase: jest.fn(() => Promise.resolve(mockSurrealDatabase)),
}));

describe('Effect belief statement repository', () => {
  beforeEach(() => {
    resetSurrealDatabaseMock();
  });

  it('persists custom and built-in guiding statements', async () => {
    const custom = {
      kind: 'custom',
      beliefSystemId: CustomBeliefSystemId.make('custom-pause'),
      harmfulStatement: 'I must always function.',
      guidingStatement: 'I may pause and I am still loved.',
    } satisfies BeliefStatement;
    const builtIn = {
      kind: 'built-in',
      beliefSystemId: BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING,
      guidingStatement: 'I may pause and I am still loved.',
    } satisfies BeliefStatement;

    await Effect.runPromise(persistBeliefStatement(custom));
    await Effect.runPromise(persistBeliefStatement(builtIn));

    expect(mockSurrealQuery).toHaveBeenCalledWith(
      'UPSERT $record CONTENT $statement',
      expect.objectContaining({
        statement: expect.objectContaining({
          kind: 'custom',
          statementId: custom.beliefSystemId,
          harmfulStatement: custom.harmfulStatement,
          guidingStatement: custom.guidingStatement,
        }),
      }),
    );
    expect(mockSurrealQuery).toHaveBeenCalledWith(
      'UPSERT $record CONTENT $statement',
      expect.objectContaining({
        statement: expect.objectContaining({
          kind: 'built-in',
          statementId: builtIn.beliefSystemId,
          guidingStatement: builtIn.guidingStatement,
        }),
      }),
    );
  });

  it('loads schema-validated statements from SurrealDB', async () => {
    const stored = {
      kind: 'custom',
      beliefSystemId: 'custom-pause',
      harmfulStatement: 'I must always function.',
      guidingStatement: 'I may pause and I am still loved.',
    };
    mockSurrealQuery.mockResolvedValueOnce([{ statementIndex: 0, value: [stored] }]);

    await expect(Effect.runPromise(loadBeliefStatements)).resolves.toEqual([stored]);
  });

  it('surfaces invalid data and write failures as tagged errors', async () => {
    mockSurrealQuery.mockResolvedValueOnce([{
      statementIndex: 0,
      value: [{ kind: 'custom', beliefSystemId: 'invalid' }],
    }]);
    await expect(Effect.runPromise(Effect.flip(loadBeliefStatements))).resolves.toMatchObject({
      _tag: 'BeliefStatementDataError',
      operation: 'decode',
    });

    failNextSurrealUpsert(new Error('storage unavailable'));
    const statement = {
      kind: 'built-in',
      beliefSystemId: BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING,
      guidingStatement: 'I may pause.',
    } satisfies BeliefStatement;
    await expect(
      Effect.runPromise(Effect.flip(persistBeliefStatement(statement))),
    ).resolves.toMatchObject({
      _tag: 'BeliefStatementStorageError',
      operation: 'write',
    });
  });
});
