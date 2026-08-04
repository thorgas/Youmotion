const mockDirectoryCreate = jest.fn();
const mockClient = { query: jest.fn() };
const mockConnect = jest.fn(async () => mockClient);
let mockDirectoryUri = 'file:///documents/youmotion-surrealdb';

jest.mock('expo-file-system', () => ({
  Directory: class MockDirectory {
    readonly uri = mockDirectoryUri;
    readonly create = mockDirectoryCreate;
  },
  Paths: { document: 'file:///documents' },
}));

jest.mock('react-native-surrealdb', () => ({
  connect: mockConnect,
  SurrealRecordId: class MockSurrealRecordId {
    readonly kind = 'record';
    readonly value: string;

    constructor(mockValue: string) {
      this.value = mockValue;
    }
  },
}));

function loadDatabaseModule() {
  return jest.requireActual<typeof import('../infrastructure/surrealdb.database')>(
    '../infrastructure/surrealdb.database',
  );
}

describe('SurrealDB connection', () => {
  beforeEach(() => {
    jest.resetModules();
    mockDirectoryUri = 'file:///documents/youmotion-surrealdb';
    mockDirectoryCreate.mockReset();
    mockConnect.mockReset();
    mockConnect.mockResolvedValue(mockClient);
    mockClient.query.mockReset();
    mockClient.query.mockImplementation(async (surql: string) => [{
      statementIndex: 0,
      value: surql.startsWith('SELECT') ? [] : null,
    }]);
  });

  it('creates the database directory and shares one persistent connection', async () => {
    const { getDatabase } = loadDatabaseModule();

    const first = await getDatabase();
    const second = await getDatabase();

    expect(first).toBe(mockClient);
    expect(second).toBe(mockClient);
    expect(mockDirectoryCreate).toHaveBeenCalledWith({ idempotent: true, intermediates: true });
    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockConnect).toHaveBeenCalledWith({
      endpoint: 'surrealkv:///documents/youmotion-surrealdb',
      namespace: 'youmotion',
      database: 'local',
    });
    expect(mockClient.query).toHaveBeenCalledWith(
      'DEFINE TABLE IF NOT EXISTS database_migration SCHEMALESS',
    );
    expect(mockClient.query).toHaveBeenCalledWith(
      'SELECT migrationId FROM database_migration',
    );
    expect(mockClient.query).toHaveBeenCalledWith(
      expect.stringMatching(/BEGIN TRANSACTION;[\s\S]*COMMIT TRANSACTION;/),
      expect.objectContaining({
        ledgerEntry: expect.objectContaining({
          migrationId: '0001-backfill-check-in-occurrence-time',
        }),
      }),
    );
  });

  it('rejects non-file database locations', async () => {
    mockDirectoryUri = 'content://documents/youmotion-surrealdb';
    const { getDatabase } = loadDatabaseModule();

    await expect(getDatabase()).rejects.toThrow('SurrealDB requires a local file URI.');
    expect(mockConnect).not.toHaveBeenCalled();
  });

  it('allows a connection retry after a native failure', async () => {
    mockConnect.mockRejectedValueOnce(new Error('native connection failed'));
    const { getDatabase } = loadDatabaseModule();

    await expect(getDatabase()).rejects.toThrow('native connection failed');
    await expect(getDatabase()).resolves.toBe(mockClient);
    expect(mockConnect).toHaveBeenCalledTimes(2);
  });

  it('allows a complete migration retry after a transaction failure', async () => {
    mockClient.query
      .mockResolvedValueOnce([{ statementIndex: 0, value: null }])
      .mockResolvedValueOnce([{ statementIndex: 0, value: [] }])
      .mockRejectedValueOnce(new Error('migration transaction failed'));
    const { getDatabase } = loadDatabaseModule();

    await expect(getDatabase()).rejects.toThrow(/"operation": "apply"/);
    await expect(getDatabase()).resolves.toBe(mockClient);
    expect(mockConnect).toHaveBeenCalledTimes(2);
  });
});
