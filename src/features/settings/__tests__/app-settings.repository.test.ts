import * as Effect from 'effect/Effect';

import {
  APP_LOCALES,
  EMOTION_LABEL_MODES,
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
  beforeEach(() => {
    storedSettings = undefined;
    mockQuery.mockClear();
  });

  it('initializes a fresh SurrealDB settings record with app defaults', async () => {
    await expect(Effect.runPromise(loadAppSettings)).resolves.toEqual({
      locale: APP_LOCALES.ENGLISH,
      emotionLabelMode: EMOTION_LABEL_MODES.EMOJI,
      onboardingCompleted: false,
    });
    expect(storedSettings).toEqual({
      locale: APP_LOCALES.ENGLISH,
      emotionLabelMode: EMOTION_LABEL_MODES.EMOJI,
      onboardingCompleted: false,
    });
  });

  it('migrates a legacy settings row so every existing user sees onboarding once', async () => {
    storedSettings = {
      locale: APP_LOCALES.GERMAN,
      emotionLabelMode: EMOTION_LABEL_MODES.BOTH,
    };

    await expect(Effect.runPromise(loadAppSettings)).resolves.toEqual({
      locale: APP_LOCALES.GERMAN,
      emotionLabelMode: EMOTION_LABEL_MODES.BOTH,
      onboardingCompleted: false,
    });
    expect(storedSettings).toEqual({
      locale: APP_LOCALES.GERMAN,
      emotionLabelMode: EMOTION_LABEL_MODES.BOTH,
      onboardingCompleted: false,
    });
  });

  it('persists and reloads every app setting from SurrealDB', async () => {
    const settings = {
      locale: APP_LOCALES.GERMAN,
      emotionLabelMode: EMOTION_LABEL_MODES.TEXT,
      onboardingCompleted: true,
    } satisfies AppSettings;

    await Effect.runPromise(persistAppSettings(settings));

    await expect(Effect.runPromise(loadAppSettings)).resolves.toEqual(settings);
  });

  it('rejects invalid settings read from SurrealDB', async () => {
    storedSettings = {
      locale: 'fr-FR',
      emotionLabelMode: 'pictures',
      onboardingCompleted: 'yes',
    };

    const result = await Effect.runPromise(Effect.either(loadAppSettings));
    if (result._tag !== 'Left') throw new Error('Invalid stored settings must fail decoding.');
    expect(result.left).toMatchObject({ _tag: 'AppSettingsDataError' });
  });
});
