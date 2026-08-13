import * as Effect from 'effect/Effect';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';

import {
  APP_LOCALES,
  BELIEF_SYSTEM_IDS,
  EMOTION_IDS,
  EMOTION_LABEL_MODES,
} from '@/constants';
import {
  mockSurrealDatabase,
  mockSurrealQuery,
  resetSurrealDatabaseMock,
} from '@/test-utils/surrealdb.repository.mock';
import {
  DATA_ARCHIVE_VERSION,
  DataArchiveSchema,
  DataArchiveTimestamp,
} from '../domain/data-archive';
import { CheckInId, CheckInTimestamp } from '@/features/check-in/domain/check-in';
import {
  deleteAllJournalData,
  exportDataArchive,
  pickDataArchive,
  restoreDataArchive,
} from '../infrastructure/data-archive.repository';

const mockFiles = new Map<string, string>();

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

const mockDocumentPicker = jest.mocked(DocumentPicker.getDocumentAsync);
const mockIsSharingAvailable = jest.mocked(Sharing.isAvailableAsync);
const mockShare = jest.mocked(Sharing.shareAsync);

jest.mock('expo-file-system', () => ({
  Paths: { cache: 'file:///cache' },
  File: class MockFile {
    readonly uri: string;

    constructor(...parts: readonly { toString: () => string }[]) {
      this.uri = parts.map((part) => part.toString()).join('/');
    }

    create() {}

    write(contents: string) {
      mockFiles.set(this.uri, contents);
    }

    async text() {
      const contents = mockFiles.get(this.uri);
      if (contents === undefined) throw new Error('Missing mock file.');
      return contents;
    }
  },
}));

jest.mock('@/features/check-in/infrastructure/surrealdb.database', () => ({
  getDatabase: jest.fn(() => Promise.resolve(mockSurrealDatabase)),
  queryDatabase: jest.fn(({ surql, variables }: {
    surql: string;
    variables?: Parameters<typeof mockSurrealDatabase.query>[1];
  }) => variables === undefined
    ? mockSurrealDatabase.query(surql)
    : mockSurrealDatabase.query(surql, variables)),
}));

const archive = DataArchiveSchema.make({
  version: 2,
  exportedAt: DataArchiveTimestamp.make('2026-08-02T08:00:00.000Z'),
  checkIns: [{
    id: CheckInId.make('moment-1'),
    createdAt: CheckInTimestamp.make('2026-08-01T18:00:00.000Z'),
    occurredAt: CheckInTimestamp.make('2026-08-01T18:00:00.000Z'),
    emotionId: EMOTION_IDS.JOY,
    intensity: 0.6,
    level: 3,
    note: 'A quiet evening.',
  }],
  beliefStatements: [{
    kind: 'built-in',
    beliefSystemId: BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING,
    guidingStatement: 'I may pause.',
  }],
  settings: {
    locale: APP_LOCALES.ENGLISH,
    emotionLabelMode: EMOTION_LABEL_MODES.BOTH,
    onboardingCompleted: true,
  },
});

function storedDataQuery(surql: string): Promise<readonly [{
  statementIndex: number;
  value: unknown;
}]> {
  if (surql.startsWith('SELECT checkInId')) {
    return Promise.resolve([{ statementIndex: 0, value: archive.checkIns }]);
  }
  if (surql.startsWith('SELECT kind')) {
    return Promise.resolve([{ statementIndex: 0, value: archive.beliefStatements.map((entry) => ({
      ...entry,
      statementId: entry.beliefSystemId,
    })) }]);
  }
  if (surql.startsWith('SELECT locale')) {
    return Promise.resolve([{ statementIndex: 0, value: [archive.settings] }]);
  }
  return Promise.resolve([{ statementIndex: 0, value: null }]);
}

describe('data archive repository', () => {
  beforeEach(() => {
    resetSurrealDatabaseMock();
    mockDocumentPicker.mockReset();
    mockIsSharingAvailable.mockReset();
    mockShare.mockReset();
    mockFiles.clear();
  });

  it('exports a schema-valid complete archive through the native share sheet', async () => {
    mockSurrealQuery.mockImplementation(storedDataQuery);
    mockIsSharingAvailable.mockResolvedValue(true);

    await Effect.runPromise(exportDataArchive());

    expect(mockShare).toHaveBeenCalledWith(
      expect.stringContaining('youmotion-backup-'),
      expect.objectContaining({ mimeType: 'application/json' }),
    );
    const sharedUri = mockShare.mock.calls[0]?.[0];
    expect(typeof sharedUri).toBe('string');
    if (typeof sharedUri !== 'string') throw new Error('Expected a shared URI.');
    expect(JSON.parse(mockFiles.get(sharedUri) ?? '')).toMatchObject({
      version: DATA_ARCHIVE_VERSION,
      checkIns: archive.checkIns,
      settings: archive.settings,
    });
  });

  it('treats a cancelled picker as no restore request', async () => {
    mockDocumentPicker.mockResolvedValue({ canceled: true, assets: null });

    await expect(Effect.runPromise(pickDataArchive())).resolves.toBeNull();
    expect(mockSurrealQuery).not.toHaveBeenCalled();
  });

  it('decodes a selected backup before returning a preview', async () => {
    const uri = 'file:///picked/youmotion.json';
    mockFiles.set(uri, JSON.stringify(archive));
    mockDocumentPicker.mockResolvedValue({
      canceled: false,
      assets: [{
        uri,
        name: 'youmotion.json',
        mimeType: 'application/json',
        size: 42,
        lastModified: 0,
      }],
    });

    await expect(Effect.runPromise(pickDataArchive())).resolves.toEqual(archive);
  });

  it('rejects a corrupt backup before any database write', async () => {
    const uri = 'file:///picked/corrupt.json';
    mockFiles.set(uri, '{"version":2}');
    mockDocumentPicker.mockResolvedValue({
      canceled: false,
      assets: [{
        uri,
        name: 'corrupt.json',
        mimeType: 'application/json',
        size: 13,
        lastModified: 0,
      }],
    });

    const error = await Effect.runPromise(Effect.flip(pickDataArchive()));

    expect(error).toMatchObject({ _tag: 'DataArchiveDataError', operation: 'decode' });
    expect(mockSurrealQuery).not.toHaveBeenCalled();
  });

  it('replaces every persisted collection in one transaction', async () => {
    await Effect.runPromise(restoreDataArchive(archive));

    expect(mockSurrealQuery).toHaveBeenCalledTimes(1);
    expect(mockSurrealQuery).toHaveBeenCalledWith(
      expect.stringMatching(/BEGIN TRANSACTION;[\s\S]*COMMIT TRANSACTION;/),
      expect.objectContaining({
        checkIns: archive.checkIns,
        beliefStatements: archive.beliefStatements,
        settings: archive.settings,
      }),
    );
  });

  it('deletes journal content atomically while preserving preferences', async () => {
    await Effect.runPromise(deleteAllJournalData());

    expect(mockSurrealQuery).toHaveBeenCalledTimes(1);
    expect(mockSurrealQuery).toHaveBeenCalledWith(
      expect.stringMatching(/BEGIN TRANSACTION;[\s\S]*DELETE check_in;[\s\S]*DELETE belief_statement;[\s\S]*COMMIT TRANSACTION;/),
    );
    expect(mockSurrealQuery.mock.calls[0]?.[0]).not.toContain('DELETE app_settings');
  });
});
