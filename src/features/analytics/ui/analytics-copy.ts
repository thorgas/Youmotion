import { fbs } from 'fbtee';

import { ANALYTICS_TIMEFRAMES, APP_LOCALES } from '@/constants';
import type { BeliefStatement } from '@/features/check-in/domain/belief-statement';
import type { AppLocale } from '@/features/settings/domain/app-locale';
import type { AnalyticsObservation } from '../domain/check-in-analytics';
import type {
  AnalyticsDateRange,
  AnalyticsTimeframe,
  TopLeitsatz,
} from '../domain/analytics-timeframe';
import type { CalendarEmotionFrequency } from '../domain/analytics-calendar';
import { beliefSystemText } from '@/features/check-in/ui/belief-system-copy';
import { emotionName } from '@/features/check-in/ui/emotion-copy';

const englishCalendarDateFormatter = new Intl.DateTimeFormat(APP_LOCALES.ENGLISH, {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const germanCalendarDateFormatter = new Intl.DateTimeFormat(APP_LOCALES.GERMAN, {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const englishMonthFormatter = new Intl.DateTimeFormat(APP_LOCALES.ENGLISH, {
  month: 'long',
  year: 'numeric',
});
const germanMonthFormatter = new Intl.DateTimeFormat(APP_LOCALES.GERMAN, {
  month: 'long',
  year: 'numeric',
});
const englishWeekdayFormatter = new Intl.DateTimeFormat(APP_LOCALES.ENGLISH, {
  weekday: 'narrow',
});
const germanWeekdayFormatter = new Intl.DateTimeFormat(APP_LOCALES.GERMAN, {
  weekday: 'narrow',
});
const englishRangeDateFormatter = new Intl.DateTimeFormat(APP_LOCALES.ENGLISH, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const germanRangeDateFormatter = new Intl.DateTimeFormat(APP_LOCALES.GERMAN, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

function localeFormatter({
  english,
  german,
  locale,
}: {
  english: Intl.DateTimeFormat;
  german: Intl.DateTimeFormat;
  locale: AppLocale;
}) {
  return locale === APP_LOCALES.GERMAN ? german : english;
}

export function analyticsMonthLabel({ date, locale }: { date: Date; locale: AppLocale }) {
  return localeFormatter({
    english: englishMonthFormatter,
    german: germanMonthFormatter,
    locale,
  }).format(date);
}

export function analyticsWeekdayLabel({ date, locale }: { date: Date; locale: AppLocale }) {
  return localeFormatter({
    english: englishWeekdayFormatter,
    german: germanWeekdayFormatter,
    locale,
  }).format(date);
}

function analyticsDateRangeLabel({
  end,
  locale,
  start,
}: {
  end: Date;
  locale: AppLocale;
  start: Date;
}) {
  const formatter = localeFormatter({
    english: englishRangeDateFormatter,
    german: germanRangeDateFormatter,
    locale,
  });
  return `${formatter.format(start)} – ${formatter.format(end)}`;
}

export function analyticsTimeframeRangeLabel({
  locale,
  range,
  timeframe,
}: {
  locale: AppLocale;
  range: AnalyticsDateRange;
  timeframe: AnalyticsTimeframe;
}) {
  if (timeframe === ANALYTICS_TIMEFRAMES.ALL_TIME || range.start === null) {
    return String(fbs('All recorded moments', 'Date range label for all-time analytics'));
  }
  const inclusiveEnd = new Date(
    range.end.getFullYear(),
    range.end.getMonth(),
    range.end.getDate() - 1,
  );
  return analyticsDateRangeLabel({ end: inclusiveEnd, locale, start: range.start });
}

export function topLeitsatzEvidenceCopy({
  leitsatz,
  locale,
  range,
  timeframe,
}: {
  leitsatz: TopLeitsatz;
  locale: AppLocale;
  range: AnalyticsDateRange;
  timeframe: AnalyticsTimeframe;
}) {
  const rangeLabel = analyticsTimeframeRangeLabel({ locale, range, timeframe });
  return String(fbs(
    'Selected '
      + fbs.param('count', String(leitsatz.count))
      + ' times · '
      + fbs.param('range', rangeLabel),
    'Evidence below the most frequently selected guiding belief in the selected analytics timeframe',
  ));
}

export function topLeitsatzLabel({
  multiple,
  timeframe,
}: {
  multiple: boolean;
  timeframe: AnalyticsTimeframe;
}) {
  if (timeframe === ANALYTICS_TIMEFRAMES.LAST_WEEK) {
    return multiple
      ? String(fbs(
        "LAST WEEK'S GUIDING BELIEFS",
        'Label for equally most frequently selected positive guiding statements last week',
      ))
      : String(fbs(
        "LAST WEEK'S GUIDING BELIEF",
        'Label for the most frequently selected positive guiding statement last week',
      ));
  }
  if (timeframe === ANALYTICS_TIMEFRAMES.LAST_FOUR_WEEKS) {
    return multiple
      ? String(fbs(
        "LAST 4 WEEKS' GUIDING BELIEFS",
        'Label for equally most frequently selected positive guiding statements in the last four weeks',
      ))
      : String(fbs(
        "LAST 4 WEEKS' GUIDING BELIEF",
        'Label for the most frequently selected positive guiding statement in the last four weeks',
      ));
  }
  return multiple
    ? String(fbs(
      'ALL-TIME GUIDING BELIEFS',
      'Label for equally most frequently selected positive guiding statements across all recorded moments',
    ))
    : String(fbs(
      'ALL-TIME GUIDING BELIEF',
      'Label for the most frequently selected positive guiding statement across all recorded moments',
    ));
}

export function additionalTopLeitsaetzeCopy(count: number) {
  return String(fbs(
    fbs.param('count', String(count)) + ' more were selected equally often.',
    'Copy below tied guiding beliefs when more equally frequent beliefs exist than the card displays',
  ));
}

export function observationCopy({ observation, statements }: {
  observation: AnalyticsObservation;
  statements: readonly BeliefStatement[];
}) {
  if (observation.kind === 'history') {
    return String(fbs(
      'You recorded '
        + fbs.param('momentCount', String(observation.momentCount))
        + ' moments across '
        + fbs.param('dayCount', String(observation.dayCount))
        + ' different days.',
      'Analytics observation summarizing recorded moments and days',
    ));
  }
  if (observation.kind === 'emotion') {
    return String(fbs(
      fbs.param('emotion', emotionName(observation.emotionId))
        + ' appeared in '
        + fbs.param('count', String(observation.count))
        + ' of the moments you chose to record.',
      'Analytics observation about the most frequently recorded emotion',
    ));
  }
  if (observation.kind === 'belief') {
    return String(fbs(
      fbs.param('belief', beliefSystemText({
        id: observation.beliefSystemId,
        statements,
      }))
        + ' appeared alongside '
        + fbs.param('emotion', emotionName(observation.emotionId))
        + ' in '
        + fbs.param('count', String(observation.count))
        + ' recorded moments.',
      'Analytics observation about a recurring emotion and core belief pairing',
    ));
  }
  return String(fbs(
    'You added a written reflection to '
      + fbs.param('count', String(observation.count))
      + ' of '
      + fbs.param('momentCount', String(observation.momentCount))
      + ' recorded moments.',
    'Analytics observation summarizing written reflection use',
  ));
}

export function insightEvidenceCopy({
  momentCount,
  rangeLabel,
  supportingCount,
}: {
  momentCount: number;
  rangeLabel: string;
  supportingCount: number;
}) {
  return String(fbs(
    'Based on '
      + fbs.param('supportingCount', String(supportingCount))
      + ' of '
      + fbs.param('momentCount', String(momentCount))
      + ' moments · '
      + fbs.param('range', rangeLabel),
    'Evidence count and comparison period below the primary analytics insight',
  ));
}

export function insightLearningCopy(remainingCount: number) {
  return String(fbs(
    'Record '
      + fbs.param('remainingCount', String(remainingCount))
      + ' more moments in this period to reveal a pattern with visible evidence.',
    'Analytics learning state before enough moments exist for an insight',
  ));
}

export function insightNoPatternCopy({ momentCount, rangeLabel }: {
  momentCount: number;
  rangeLabel: string;
}) {
  return String(fbs(
    'No single recurring pattern stands out across '
      + fbs.param('momentCount', String(momentCount))
      + ' moments · '
      + fbs.param('range', rangeLabel)
      + '. That is useful to know too.',
    'Honest analytics state when enough data exists but no unique pattern stands out',
  ));
}

export function calendarDayAccessibilityLabel({
  date,
  frequencies,
  locale,
}: {
  date: Date;
  frequencies: readonly CalendarEmotionFrequency[];
  locale: AppLocale;
}) {
  const dateLabel = localeFormatter({
    english: englishCalendarDateFormatter,
    german: germanCalendarDateFormatter,
    locale,
  }).format(date);
  if (frequencies.length === 0) {
    return String(fbs(
      fbs.param('date', dateLabel) + '. No recorded moments.',
      'Accessibility label for an empty analytics calendar day',
    ));
  }
  const momentCount = frequencies.reduce((total, frequency) => total + frequency.count, 0);
  return String(fbs(
    fbs.param('date', dateLabel)
      + '. '
      + fbs.param('count', String(momentCount))
      + ' recorded moments: '
      + fbs.param('emotions', frequencies.map(({ count, emotionId }) => (
        `${emotionName(emotionId)} ${count}`
      )).join(', '))
      + '.',
    'Accessibility label for an analytics calendar day with ranked emotion counts',
  ));
}
