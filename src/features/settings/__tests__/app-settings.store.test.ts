import { getLocales, type Locale } from 'expo-localization';

import { APP_LOCALES } from '@/constants';
import { initialAppSettingsContext } from '../application/app-settings.store';

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

describe('app settings store', () => {
  it('uses German as the unhydrated fallback for a German device', () => {
    jest.mocked(getLocales).mockReturnValue([
      systemLocale({ languageCode: 'de', languageTag: 'de-DE' }),
    ]);

    expect(initialAppSettingsContext()).toMatchObject({
      locale: APP_LOCALES.GERMAN,
      hydrated: false,
    });
  });
});
