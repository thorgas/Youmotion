import {
  APP_LOCALES,
  EMOTION_LABEL_MODES,
} from '@/constants';

type QueryResult = readonly [{
  statementIndex: number;
  value: unknown;
}];

let nextUpsertFailure: unknown;
let nextDeleteFailure: unknown;

async function defaultQuery(surql: string): Promise<QueryResult> {
  if (surql.startsWith('UPSERT') && nextUpsertFailure !== undefined) {
    const cause = nextUpsertFailure;
    nextUpsertFailure = undefined;
    throw cause;
  }
  if (surql.startsWith('DELETE') && nextDeleteFailure !== undefined) {
    const cause = nextDeleteFailure;
    nextDeleteFailure = undefined;
    throw cause;
  }
  if (surql.startsWith('SELECT locale, emotionLabelMode')) {
    return [{
      statementIndex: 0,
      value: [{
        locale: APP_LOCALES.ENGLISH,
        emotionLabelMode: EMOTION_LABEL_MODES.EMOJI,
      }],
    }];
  }
  return [{ statementIndex: 0, value: surql.startsWith('SELECT') ? [] : null }];
}

export const mockSurrealQuery = jest.fn(defaultQuery);
export const mockSurrealDatabase = { query: mockSurrealQuery };

export function resetSurrealDatabaseMock() {
  nextUpsertFailure = undefined;
  nextDeleteFailure = undefined;
  mockSurrealQuery.mockReset();
  mockSurrealQuery.mockImplementation(defaultQuery);
}

export function failNextSurrealUpsert(cause: unknown) {
  nextUpsertFailure = cause;
}

export function failNextSurrealDelete(cause: unknown) {
  nextDeleteFailure = cause;
}
