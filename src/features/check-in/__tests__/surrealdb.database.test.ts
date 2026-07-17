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

jest.mock('react-native-surrealdb', () => ({ connect: mockConnect }));

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
});
