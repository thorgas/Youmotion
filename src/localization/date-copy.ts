import { APP_LOCALES } from '@/constants';

const headlineDateFormatters = new Map<string, Intl.DateTimeFormat>([
  [APP_LOCALES.ENGLISH, new Intl.DateTimeFormat(APP_LOCALES.ENGLISH, {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  })],
  [APP_LOCALES.GERMAN, new Intl.DateTimeFormat(APP_LOCALES.GERMAN, {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  })],
]);

const historyDateFormatters = new Map<string, Intl.DateTimeFormat>([
  [APP_LOCALES.ENGLISH, new Intl.DateTimeFormat(APP_LOCALES.ENGLISH, { dateStyle: 'medium', timeStyle: 'short' })],
  [APP_LOCALES.GERMAN, new Intl.DateTimeFormat(APP_LOCALES.GERMAN, { dateStyle: 'medium', timeStyle: 'short' })],
]);

const momentDateFormatters = new Map<string, Intl.DateTimeFormat>([
  [APP_LOCALES.ENGLISH, new Intl.DateTimeFormat(APP_LOCALES.ENGLISH, { dateStyle: 'medium' })],
  [APP_LOCALES.GERMAN, new Intl.DateTimeFormat(APP_LOCALES.GERMAN, { dateStyle: 'medium' })],
]);

const momentTimeFormatters = new Map<string, Intl.DateTimeFormat>([
  [APP_LOCALES.ENGLISH, new Intl.DateTimeFormat(APP_LOCALES.ENGLISH, { timeStyle: 'short' })],
  [APP_LOCALES.GERMAN, new Intl.DateTimeFormat(APP_LOCALES.GERMAN, { timeStyle: 'short' })],
]);

export function formatHeadlineDate({ date, locale }: { date: Date; locale: string }) {
  return (headlineDateFormatters.get(locale) ?? headlineDateFormatters.get(APP_LOCALES.ENGLISH))?.format(date) ?? '';
}

export function formatHistoryDate({ date, locale }: { date: Date; locale: string }) {
  return (historyDateFormatters.get(locale) ?? historyDateFormatters.get(APP_LOCALES.ENGLISH))?.format(date) ?? '';
}

export function formatMomentDate({ date, locale }: { date: Date; locale: string }) {
  return (momentDateFormatters.get(locale) ?? momentDateFormatters.get(APP_LOCALES.ENGLISH))?.format(date) ?? '';
}

export function formatMomentTime({ date, locale }: { date: Date; locale: string }) {
  return (momentTimeFormatters.get(locale) ?? momentTimeFormatters.get(APP_LOCALES.ENGLISH))?.format(date) ?? '';
}
