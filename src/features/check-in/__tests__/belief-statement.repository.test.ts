import * as Effect from 'effect/Effect';

import { BELIEF_SYSTEM_IDS } from '@/constants';
import {
  BeliefStatementArchiveTimestamp,
  CustomBeliefSystemId,
  type BeliefStatement,
} from '../domain/belief-statement';
import {
  deleteBeliefStatement,
  loadBeliefStatements,
  persistBeliefStatement,
  retireCustomBeliefStatement,
} from '../infrastructure/belief-statement.repository';
import {
  failNextSurrealDelete,
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

  it('loads archived statements so historical moments keep their wording', async () => {
    const stored = {
      kind: 'custom',
      beliefSystemId: 'custom-archived',
      harmfulStatement: 'I must never need help.',
      archivedAt: '2026-07-19T12:00:00.000Z',
    };
    mockSurrealQuery.mockResolvedValueOnce([{ statementIndex: 0, value: [stored] }]);

    await expect(Effect.runPromise(loadBeliefStatements)).resolves.toEqual([stored]);
  });

  it('deletes a guiding statement by its stable belief ID', async () => {
    await Effect.runPromise(
      deleteBeliefStatement(BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING),
    );

    expect(mockSurrealQuery).toHaveBeenCalledWith(
      'DELETE $record',
      expect.objectContaining({
        record: expect.objectContaining({
          kind: 'record',
          value: expect.stringContaining(BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING),
        }),
      }),
    );
  });

  it('hard-deletes an unused personal belief', async () => {
    const statement = {
      kind: 'custom',
      beliefSystemId: CustomBeliefSystemId.make('custom-unused'),
      harmfulStatement: 'I must never need help.',
    } satisfies BeliefStatement;

    await expect(Effect.runPromise(retireCustomBeliefStatement({
      statement,
      archivedAt: BeliefStatementArchiveTimestamp.make('2026-07-19T12:00:00.000Z'),
    }))).resolves.toBeNull();

    expect(mockSurrealQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE beliefSystemId = $beliefSystemId LIMIT 1'),
      { beliefSystemId: statement.beliefSystemId },
    );
    expect(mockSurrealQuery).toHaveBeenCalledWith(
      'DELETE $record',
      expect.objectContaining({
        record: expect.objectContaining({
          value: expect.stringContaining(statement.beliefSystemId),
        }),
      }),
    );
  });

  it('archives a referenced personal belief instead of breaking history', async () => {
    const statement = {
      kind: 'custom',
      beliefSystemId: CustomBeliefSystemId.make('custom-referenced'),
      harmfulStatement: 'I must never need help.',
      guidingStatement: 'I can ask for support.',
    } satisfies BeliefStatement;
    mockSurrealQuery.mockResolvedValueOnce([{
      statementIndex: 0,
      value: ['saved-check-in'],
    }]);

    const retired = await Effect.runPromise(retireCustomBeliefStatement({
      statement,
      archivedAt: BeliefStatementArchiveTimestamp.make('2026-07-19T12:00:00.000Z'),
    }));

    expect(retired).toEqual({
      ...statement,
      archivedAt: '2026-07-19T12:00:00.000Z',
    });
    expect(mockSurrealQuery).toHaveBeenCalledWith(
      'UPSERT $record CONTENT $statement',
      expect.objectContaining({
        statement: expect.objectContaining({
          statementId: statement.beliefSystemId,
          archivedAt: '2026-07-19T12:00:00.000Z',
        }),
      }),
    );
    expect(mockSurrealQuery).not.toHaveBeenCalledWith(
      'DELETE $record',
      expect.anything(),
    );
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

    failNextSurrealDelete(new Error('storage unavailable'));
    await expect(
      Effect.runPromise(Effect.flip(
        deleteBeliefStatement(BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING),
      )),
    ).resolves.toMatchObject({
      _tag: 'BeliefStatementStorageError',
      operation: 'delete',
    });
  });
});
