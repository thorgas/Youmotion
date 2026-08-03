import * as Schema from 'effect/Schema';

import { ANALYTICS_TIMEFRAMES } from '@/constants';
import type { CheckIn } from '@/features/check-in/domain/check-in';
import { CheckInIdListSchema } from '@/features/check-in/domain/check-in';
import {
  BeliefStatementText,
  BeliefSystemId,
  beliefStatementForId,
  type BeliefStatement,
} from '@/features/check-in/domain/belief-statement';

export const AnalyticsTimeframeSchema = Schema.Literal(
  ANALYTICS_TIMEFRAMES.LAST_WEEK,
  ANALYTICS_TIMEFRAMES.LAST_FOUR_WEEKS,
  ANALYTICS_TIMEFRAMES.ALL_TIME,
);
export type AnalyticsTimeframe = typeof AnalyticsTimeframeSchema.Type;

export const TopLeitsatzSchema = Schema.Struct({
  beliefSystemId: BeliefSystemId,
  guidingStatement: BeliefStatementText,
  count: Schema.Int.pipe(Schema.positive()),
  supportingIds: CheckInIdListSchema,
});
export type TopLeitsatz = typeof TopLeitsatzSchema.Type;
export type TopLeitsatzGroup = Readonly<{
  additionalCount: number;
  leitsaetze: readonly TopLeitsatz[];
  range: AnalyticsDateRange;
  timeframe: AnalyticsTimeframe;
}>;

export type AnalyticsDateRange = Readonly<{ start: Date | null; end: Date }>;

function startOfLocalWeek(date: Date) {
  const mondayOffset = (date.getDay() + 6) % 7;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - mondayOffset);
}

function daysBefore({ date, dayCount }: { date: Date; dayCount: number }) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - dayCount);
}

export function analyticsDateRange({
  now,
  timeframe,
}: {
  now: Date;
  timeframe: AnalyticsTimeframe;
}): AnalyticsDateRange {
  const end = startOfLocalWeek(now);
  if (timeframe === ANALYTICS_TIMEFRAMES.ALL_TIME) return { start: null, end };
  if (timeframe === ANALYTICS_TIMEFRAMES.LAST_FOUR_WEEKS) {
    return { start: daysBefore({ date: end, dayCount: 28 }), end };
  }
  return { start: daysBefore({ date: end, dayCount: 7 }), end };
}

export function entriesForAnalyticsTimeframe({
  entries,
  now,
  timeframe,
}: {
  entries: readonly CheckIn[];
  now: Date;
  timeframe: AnalyticsTimeframe;
}) {
  const range = analyticsDateRange({ now, timeframe });
  if (range.start === null) return entries;
  const start = range.start;
  return entries.filter((entry) => {
    const occurredAt = new Date(entry.occurredAt);
    return !Number.isNaN(occurredAt.getTime()) && occurredAt >= start && occurredAt < range.end;
  });
}

const MAX_VISIBLE_TOP_LEITSAETZE = 3;

type LeitsatzFrequency = Readonly<{
  beliefSystemId: BeliefSystemId;
  count: number;
  guidingStatement: string;
  latestAt: number;
  supportingIds: readonly CheckIn['id'][];
}>;

function rankLeitsatzFrequencies(items: readonly LeitsatzFrequency[]) {
  return items.reduce<readonly LeitsatzFrequency[]>((ranked, item) => {
    const insertionIndex = ranked.findIndex((candidate) => (
      item.count > candidate.count
      || (item.count === candidate.count && item.latestAt > candidate.latestAt)
    ));
    if (insertionIndex === -1) return ranked.concat(item);
    return ranked
      .slice(0, insertionIndex)
      .concat(item, ranked.slice(insertionIndex));
  }, []);
}

export function topLeitsaetzeForTimeframe({
  entries,
  now,
  statements,
  timeframe,
}: {
  entries: readonly CheckIn[];
  now: Date;
  statements: readonly BeliefStatement[];
  timeframe: AnalyticsTimeframe;
}): TopLeitsatzGroup | null {
  const range = analyticsDateRange({ now, timeframe });
  const timeframeEntries = entriesForAnalyticsTimeframe({
    entries,
    now,
    timeframe,
  });
  const frequencies = timeframeEntries.reduce<readonly LeitsatzFrequency[]>((items, entry) => {
    if (!entry.beliefSystemId) return items;
    const statement = beliefStatementForId({
      beliefSystemId: entry.beliefSystemId,
      statements,
    });
    const guidingStatement = entry.guidingStatementSnapshot ?? statement?.guidingStatement;
    if (!guidingStatement) return items;
    const occurredAt = new Date(entry.occurredAt).getTime();
    const existing = items.find(({ beliefSystemId }) => beliefSystemId === entry.beliefSystemId);
    if (!existing) {
      return items.concat({
        beliefSystemId: entry.beliefSystemId,
        count: 1,
        guidingStatement,
        latestAt: occurredAt,
        supportingIds: [entry.id],
      });
    }
    return items.map((item) => item !== existing ? item : {
      ...item,
      count: item.count + 1,
      guidingStatement: occurredAt > item.latestAt ? guidingStatement : item.guidingStatement,
      latestAt: Math.max(occurredAt, item.latestAt),
      supportingIds: item.supportingIds.concat(entry.id),
    });
  }, []);
  const ranked = rankLeitsatzFrequencies(frequencies);
  const highestCount = ranked[0]?.count;
  if (highestCount === undefined) return null;
  const coLeaders = ranked.filter(({ count }) => count === highestCount);
  const visibleLeitsaetze = coLeaders
    .slice(0, MAX_VISIBLE_TOP_LEITSAETZE)
    .map((leader) => TopLeitsatzSchema.make({
      beliefSystemId: leader.beliefSystemId,
      guidingStatement: leader.guidingStatement,
      count: leader.count,
      supportingIds: leader.supportingIds,
    }));
  return {
    additionalCount: coLeaders.length - visibleLeitsaetze.length,
    leitsaetze: visibleLeitsaetze,
    range,
    timeframe,
  };
}
