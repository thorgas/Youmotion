import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Effect from 'effect/Effect';

import {
  APP_LOCALES,
  EMOTION_LABEL_MODES,
  EMOTION_LABEL_MODE_STORAGE_KEY,
} from '@/constants';
import type { AppSettings } from '../domain/app-settings';
import {
  loadAppSettings,
  persistAppSettings,
} from '../infrastructure/app-settings.repository';

type QueryResult = readonly [{
  statementIndex: number;
  value: unknown;
}];

let storedSettings: unknown;

const mockQuery = jest.fn(async (
  surql: string,
  variables?: Readonly<Record<string, unknown>>,
): Promise<QueryResult> => {
  if (surql.startsWith('SELECT')) {
    return [{
      statementIndex: 0,
      value: storedSettings === undefined ? [] : [storedSettings],
    }];
  }
  if (surql.startsWith('UPSERT')) storedSettings = variables?.['settings'];
  return [{ statementIndex: 0, value: null }];
});

const mockDatabase = { query: mockQuery };

jest.mock('@/features/check-in/infrastructure/surrealdb.database', () => ({
  getDatabase: jest.fn(() => Promise.resolve(mockDatabase)),
}));

describe('app settings repository', () => {
  beforeEach(async () => {
    storedSettings = undefined;
    mockQuery.mockClear();
    await AsyncStorage.clear();
  });

  it('migrates the legacy emotion-label preference into the SurrealDB settings record', async () => {
    await AsyncStorage.setItem(EMOTION_LABEL_MODE_STORAGE_KEY, EMOTION_LABEL_MODES.BOTH);

    await expect(Effect.runPromise(loadAppSettings)).resolves.toEqual({
      locale: APP_LOCALES.ENGLISH,
      emotionLabelMode: EMOTION_LABEL_MODES.BOTH,
    });
    expect(storedSettings).toEqual({
      locale: APP_LOCALES.ENGLISH,
      emotionLabelMode: EMOTION_LABEL_MODES.BOTH,
    });
    await expect(AsyncStorage.getItem(EMOTION_LABEL_MODE_STORAGE_KEY)).resolves.toBeNull();
  });

  it('persists and reloads every app setting from SurrealDB', async () => {
    const settings = {
      locale: APP_LOCALES.GERMAN,
      emotionLabelMode: EMOTION_LABEL_MODES.TEXT,
    } satisfies AppSettings;

    await Effect.runPromise(persistAppSettings(settings));

    await expect(Effect.runPromise(loadAppSettings)).resolves.toEqual(settings);
  });

  it('rejects invalid settings read from SurrealDB', async () => {
    storedSettings = {
      locale: 'fr-FR',
      emotionLabelMode: 'pictures',
    };

    const result = await Effect.runPromise(Effect.either(loadAppSettings));
    if (result._tag !== 'Left') throw new Error('Invalid stored settings must fail decoding.');
    expect(result.left).toMatchObject({ _tag: 'AppSettingsDataError' });
  });
});
