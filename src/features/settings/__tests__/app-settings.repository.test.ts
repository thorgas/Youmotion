import * as Effect from 'effect/Effect';
import { getLocales, type Locale } from 'expo-localization';

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

function systemLocale({
  languageCode,
  languageTag,
}: Pick<Locale, 'languageCode' | 'languageTag'>): Locale {
  return {
    currencyCode: null,
    currencySymbol: null,
    decimalSeparator: null,
    digitGroupingSeparator: null,
    languageCode,
    languageCurrencyCode: null,
    languageCurrencySymbol: null,
    languageRegionCode: null,
    languageScriptCode: null,
    languageTag,
    measurementSystem: null,
    regionCode: null,
    temperatureUnit: null,
    textDirection: 'ltr',
  };
}

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
    jest.mocked(getLocales).mockClear();
    jest.mocked(getLocales).mockReturnValue([
      systemLocale({ languageCode: 'en', languageTag: 'en-US' }),
    ]);
  });

  it('uses German for a fresh settings record when it is a preferred system language', async () => {
    jest.mocked(getLocales).mockReturnValue([
      systemLocale({ languageCode: 'fr', languageTag: 'fr-FR' }),
      systemLocale({ languageCode: 'de', languageTag: 'de-DE' }),
      systemLocale({ languageCode: 'en', languageTag: 'en-US' }),
    ]);

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

  it('falls back to English when no preferred system language is supported', async () => {
    jest.mocked(getLocales).mockReturnValue([
      systemLocale({ languageCode: 'fr', languageTag: 'fr-FR' }),
      systemLocale({ languageCode: 'es', languageTag: 'es-ES' }),
    ]);

    await expect(Effect.runPromise(loadAppSettings)).resolves.toEqual({
      locale: APP_LOCALES.ENGLISH,
      emotionLabelMode: EMOTION_LABEL_MODES.BOTH,
      onboardingCompleted: false,
    });
    expect(storedSettings).toEqual({
      locale: APP_LOCALES.ENGLISH,
      emotionLabelMode: EMOTION_LABEL_MODES.BOTH,
      onboardingCompleted: false,
    });
  });

  it('keeps a saved language choice instead of replacing it from the system', async () => {
    jest.mocked(getLocales).mockReturnValue([
      systemLocale({ languageCode: 'de', languageTag: 'de-DE' }),
    ]);
    storedSettings = {
      locale: APP_LOCALES.ENGLISH,
      emotionLabelMode: EMOTION_LABEL_MODES.TEXT,
      onboardingCompleted: true,
    };

    await expect(Effect.runPromise(loadAppSettings)).resolves.toEqual(storedSettings);
    expect(getLocales).not.toHaveBeenCalled();
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
