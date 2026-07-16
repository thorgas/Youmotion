import { getLocales } from 'expo-localization';
import { createLocaleContext } from 'fbtee';
import type { PropsWithChildren } from 'react';

import { APP_LOCALES } from '@/constants';
import deDE from '@/translations/de-DE.json';

const _loadGerman = async () => deDE[APP_LOCALES.GERMAN];
const localeLoaders = new Map<string, typeof _loadGerman>([[APP_LOCALES.GERMAN, _loadGerman]]);

const _loadLocale = async (locale: string) => {
  const loader = localeLoaders.get(locale);
  return loader ? loader() : {};
};

const LocaleContext = createLocaleContext({
  availableLanguages: new Map([
    [APP_LOCALES.ENGLISH, 'English'],
    [APP_LOCALES.GERMAN, 'Deutsch'],
  ]),
  clientLocales: getLocales().map(({ languageTag }) => languageTag),
  loadLocale: _loadLocale,
});

export function AppLocaleProvider({ children }: PropsWithChildren) {
  return <LocaleContext>{children}</LocaleContext>;
}
