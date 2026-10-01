import * as Schema from 'effect/Schema';
import assert from '@/assert';
import { ANALYTICS_INSIGHT_TABS, ANALYTICS_TIMEFRAMES, INSIGHT_NOTIFICATION_DEFAULT_TIME } from '@/constants';
import type { CheckIn } from '@/features/check-in/domain/check-in';
import type { BeliefStatement } from '@/features/beliefs/domain/belief-statement';
import { entriesForAnalyticsTimeframe, topLeitsaetzeForTimeframe, AnalyticsTimeframeSchema } from '@/features/analytics/domain/analytics-timeframe';
import { primaryAnalyticsInsights } from '@/features/analytics/domain/check-in-analytics';
import { ReminderLocalTime } from '@/features/reminders/domain/reminder-timing';

export const InsightCandidateSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.minLength(1)),
  timeframe: AnalyticsTimeframeSchema,
  tab: Schema.Literal(ANALYTICS_INSIGHT_TABS.GUIDING_BELIEF, ANALYTICS_INSIGHT_TABS.PATTERN),
  patternId: Schema.NullOr(Schema.String),
});
export type InsightCandidate = typeof InsightCandidateSchema.Type;
export const InsightBatchSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.minLength(1)),
  fireAt: Schema.String.pipe(Schema.filter((value) => Number.isFinite(Date.parse(value)), { message: () => 'Insight delivery requires a valid date' })),
  candidates: Schema.NonEmptyArray(InsightCandidateSchema),
});
export type InsightBatch = typeof InsightBatchSchema.Type;
export const InsightNotificationStateSchema = Schema.Struct({
  enabled: Schema.Boolean,
  dismissed: Schema.Boolean,
  time: ReminderLocalTime,
  seen: Schema.Array(Schema.String),
  pending: Schema.NullOr(InsightBatchSchema),
});
export type InsightNotificationState = typeof InsightNotificationStateSchema.Type;
export const initialInsightNotificationState = (): InsightNotificationState => ({
  enabled: false, dismissed: false, time: INSIGHT_NOTIFICATION_DEFAULT_TIME, seen: [], pending: null,
});

export function insightCandidates({ entries, statements, now }: {
  entries: readonly CheckIn[]; statements: readonly BeliefStatement[]; now: Date;
}): readonly InsightCandidate[] {
  return Object.values(ANALYTICS_TIMEFRAMES).flatMap((timeframe) => {
    assert(Object.values(ANALYTICS_TIMEFRAMES).includes(timeframe), 'Insight timeframe must be supported');
    assert(Number.isFinite(now.getTime()), 'Insight evaluation requires a valid current date');
    const scoped = entriesForAnalyticsTimeframe({ entries, now, timeframe });
    const group = topLeitsaetzeForTimeframe({ entries, statements, now, timeframe });
    const beliefs: ReadonlyArray<InsightCandidate> = (group?.leitsaetze ?? []).map(({ beliefSystemId }) => ({
      id: `${timeframe}:guiding-belief:${beliefSystemId}`, timeframe,
      tab: ANALYTICS_INSIGHT_TABS.GUIDING_BELIEF, patternId: null,
    }));
    const patterns = primaryAnalyticsInsights(scoped).map((pattern) => {
      const patternId = pattern.kind === 'belief'
        ? `${pattern.kind}:${pattern.emotionId}:${pattern.beliefSystemId}`
        : `${pattern.kind}:${pattern.emotionId}`;
      return { id: `${timeframe}:${patternId}`, timeframe, tab: ANALYTICS_INSIGHT_TABS.PATTERN, patternId };
    });
    return beliefs.toSorted((first, second) => first.id.localeCompare(second.id, 'en')).concat(patterns.toSorted((first, second) => first.id.localeCompare(second.id, 'en')));
  });
}

export function nextInsightDelivery({ now, time }: { now: Date; time: typeof ReminderLocalTime.Type }) {
  assert(Number.isFinite(now.getTime()), 'Insight delivery requires a valid current date');
  assert(Schema.is(ReminderLocalTime)(time), 'Insight delivery time must be within the local clock');
  const date = new Date(now);
  date.setHours(time.hour, time.minute, 0, 0);
  if (date <= now) date.setDate(date.getDate() + 1);
  return date;
}

export function pendingInsightCandidates({ state, candidates }: { state: InsightNotificationState; candidates: readonly InsightCandidate[] }) {
  assert(Schema.is(InsightNotificationStateSchema)(state), 'Insight state must satisfy its persisted contract');
  assert(candidates.every((candidate) => Schema.is(InsightCandidateSchema)(candidate)), 'Pending insight candidates must be valid targets');
  const currentIds = new Set(candidates.map(({ id }) => id));
  const pending = state.pending?.candidates.filter(({ id }) => currentIds.has(id)) ?? [];
  const pendingIds = new Set(pending.map(({ id }) => id));
  const additions = candidates.filter(({ id }) => !state.seen.includes(id) && !pendingIds.has(id));
  return [...pending, ...additions];
}

export function reconciledInsightDelivery({ state, now }: { state: InsightNotificationState; now: Date }): InsightNotificationState {
  assert(Schema.is(InsightNotificationStateSchema)(state), 'Local delivery reconciliation requires valid notification state');
  assert(Number.isFinite(now.getTime()), 'Local delivery reconciliation requires a valid clock');
  if (!state.pending) return state;
  const fireAt = new Date(state.pending.fireAt);
  if (fireAt <= now || (fireAt.getHours() === state.time.hour && fireAt.getMinutes() === state.time.minute)) return state;
  return { ...state, pending: { ...state.pending, fireAt: nextInsightDelivery({ now, time: state.time }).toISOString() } };
}
