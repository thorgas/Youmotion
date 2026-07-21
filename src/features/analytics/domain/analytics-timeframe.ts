import * as Schema from 'effect/Schema';

import { ANALYTICS_TIMEFRAMES } from '@/constants';
import type { CheckIn } from '@/features/check-in/domain/check-in';
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
  weekStartsAt: Schema.DateFromSelf,
  weekEndsAt: Schema.DateFromSelf,
});
export type TopLeitsatz = typeof TopLeitsatzSchema.Type;

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
    const createdAt = new Date(entry.createdAt);
    return !Number.isNaN(createdAt.getTime()) && createdAt >= start && createdAt < range.end;
  });
}

function twoHighestCounts<Item extends Readonly<{ count: number }>>(items: readonly Item[]) {
  let first: Item | undefined;
  let second: Item | undefined;
  items.forEach((item) => {
    if (!first || item.count > first.count) {
      second = first;
      first = item;
      return;
    }
    if (!second || item.count > second.count) second = item;
  });
  return { first, second };
}

export function topLeitsatzForPreviousWeek({
  entries,
  now,
  statements,
}: {
  entries: readonly CheckIn[];
  now: Date;
  statements: readonly BeliefStatement[];
}): TopLeitsatz | null {
  const range = analyticsDateRange({ now, timeframe: ANALYTICS_TIMEFRAMES.LAST_WEEK });
  if (range.start === null) return null;
  const weeklyEntries = entriesForAnalyticsTimeframe({
    entries,
    now,
    timeframe: ANALYTICS_TIMEFRAMES.LAST_WEEK,
  });
  const frequencies = weeklyEntries.reduce<ReadonlyArray<{
    beliefSystemId: BeliefSystemId;
    count: number;
    guidingStatement: string;
    latestAt: number;
  }>>((items, entry) => {
    if (!entry.beliefSystemId) return items;
    const statement = beliefStatementForId({
      beliefSystemId: entry.beliefSystemId,
      statements,
    });
    const guidingStatement = entry.guidingStatementSnapshot ?? statement?.guidingStatement;
    if (!guidingStatement) return items;
    const createdAt = new Date(entry.createdAt).getTime();
    const existing = items.find(({ beliefSystemId }) => beliefSystemId === entry.beliefSystemId);
    if (!existing) {
      return items.concat({
        beliefSystemId: entry.beliefSystemId,
        count: 1,
        guidingStatement,
        latestAt: createdAt,
      });
    }
    return items.map((item) => item !== existing ? item : {
      ...item,
      count: item.count + 1,
      guidingStatement: createdAt > item.latestAt ? guidingStatement : item.guidingStatement,
      latestAt: Math.max(createdAt, item.latestAt),
    });
  }, []);
  const { first, second } = twoHighestCounts(frequencies);
  if (!first || first.count === second?.count) return null;
  return TopLeitsatzSchema.make({
    beliefSystemId: first.beliefSystemId,
    guidingStatement: first.guidingStatement,
    count: first.count,
    weekStartsAt: range.start,
    weekEndsAt: daysBefore({ date: range.end, dayCount: 1 }),
  });
}
