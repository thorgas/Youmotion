type QueryResult = readonly [{
  statementIndex: number;
  value: unknown;
}];

let nextUpsertFailure: unknown;

async function defaultQuery(surql: string): Promise<QueryResult> {
  if (surql.startsWith('UPSERT') && nextUpsertFailure !== undefined) {
    const cause = nextUpsertFailure;
    nextUpsertFailure = undefined;
    throw cause;
  }
  return [{ statementIndex: 0, value: surql.startsWith('SELECT') ? [] : null }];
}

export const mockSurrealQuery = jest.fn(defaultQuery);
export const mockSurrealDatabase = { query: mockSurrealQuery };

export function resetSurrealDatabaseMock() {
  nextUpsertFailure = undefined;
  mockSurrealQuery.mockReset();
  mockSurrealQuery.mockImplementation(defaultQuery);
}

export function failNextSurrealUpsert(cause: unknown) {
  nextUpsertFailure = cause;
}
