import * as Schema from 'effect/Schema';

import { APP_LOCALES } from '@/constants';

export const AppLocaleSchema = Schema.Literal(
  APP_LOCALES.ENGLISH,
  APP_LOCALES.GERMAN,
);

export type AppLocale = typeof AppLocaleSchema.Type;

export function appLocaleForLanguageCodes(languageCodes: readonly (string | null)[]) {
  const supportedLanguageCode = languageCodes.find((languageCode) => (
    languageCode === 'de' || languageCode === 'en'
  ));
  return supportedLanguageCode === 'de' ? APP_LOCALES.GERMAN : APP_LOCALES.ENGLISH;
}
