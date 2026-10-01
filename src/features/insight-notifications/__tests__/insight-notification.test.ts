import * as Effect from 'effect/Effect';
import {
  ANALYTICS_INSIGHT_TABS,
  ANALYTICS_TIMEFRAMES,
  EMOTION_IDS,
} from '@/constants';
import * as Schema from 'effect/Schema';
import { APP_LOCALES } from '@/constants';
import { currentDataArchive, PersistedDataArchiveSchema } from '@/features/data-safety/domain/data-archive';
import { CheckInId, CheckInSchema, CheckInTimestamp, type CheckIn } from '@/features/check-in/domain/check-in';
import type { BeliefStatement } from '@/features/beliefs/domain/belief-statement';
import legacyArchive from '@/features/data-safety/__tests__/fixtures/legacy-archive.fixture.json';
import {
  InsightCandidateSchema,
  initialInsightNotificationState,
  insightCandidates,
  nextInsightDelivery,
  pendingInsightCandidates,
  reconciledInsightDelivery,
  type InsightNotificationState,
} from '../domain/insight-notification';

const archive = currentDataArchive(Effect.runSync(Schema.decodeUnknown(PersistedDataArchiveSchema)(legacyArchive)));
const archiveData = {
  entries: archive.checkIns,
  statements: archive.beliefStatements,
  locale: APP_LOCALES.ENGLISH,
  ready: true,
};
const builtInStatement = archive.beliefStatements.find(
  (statement): statement is Extract<BeliefStatement, { kind: 'built-in' }> => statement.kind === 'built-in',
);
const makeCheckIn = ({ id, at, emotionId, beliefSystemId }: {
  id: string;
  at: string;
  emotionId: CheckIn['emotionId'];
  beliefSystemId?: CheckIn['beliefSystemId'];
}): CheckIn => CheckInSchema.make({
  id: CheckInId.make(id),
  createdAt: CheckInTimestamp.make(at),
  occurredAt: CheckInTimestamp.make(at),
  emotionId,
  intensity: 0.7,
  level: 2,
  note: '',
  ...(beliefSystemId ? { beliefSystemId, guidingStatementSnapshot: 'I can take a breath.' } : {}),
});

describe('insight notification domain', () => {
  const now = new Date('2026-09-08T10:00:00.000Z');

  it('creates stable, distinct candidates for every timeframe and insight kind from the synthetic archive', () => {
    const candidates = insightCandidates({ ...archiveData, now });
    const timeframes = Object.values(ANALYTICS_TIMEFRAMES);
    expect(new Set(candidates.map(({ id }) => id)).size).toBe(candidates.length);
    for (const timeframe of timeframes) {
      const scoped = candidates.filter((candidate) => candidate.timeframe === timeframe);
      expect(scoped.length).toBeGreaterThan(0);
      expect(scoped.every((candidate) => candidate.id.startsWith(`${timeframe}:`))).toBe(true);
      expect(scoped.every(Schema.is(InsightCandidateSchema))).toBe(true);
      expect(scoped.some(({ tab }) => tab === ANALYTICS_INSIGHT_TABS.PATTERN)).toBe(true);
    }
    expect(candidates.filter(({ tab }) => tab === ANALYTICS_INSIGHT_TABS.GUIDING_BELIEF)
      .every(({ patternId }) => patternId === null)).toBe(true);
    expect(candidates.filter(({ tab }) => tab === ANALYTICS_INSIGHT_TABS.PATTERN)
      .every(({ patternId }) => patternId !== null)).toBe(true);
    expect(candidates.some(({ id }) => id.includes(':emotion:'))).toBe(true);
  });

  it('uses timeframe and pattern identity in candidate IDs', () => {
    const belief = builtInStatement;
    expect(belief).toBeDefined();
    const entries = [0, 1, 2, 3].map((index) => makeCheckIn({
      id: `joy-${String(index)}`,
      at: `2026-09-${String(2 + index).padStart(2, '0')}T09:00:00.000Z`,
      emotionId: EMOTION_IDS.JOY,
    }));
    const withBelief = [
      ...entries,
      ...[0, 1, 2].map((index) => makeCheckIn({
        id: `belief-${String(index)}`,
        at: `2026-09-${String(2 + index).padStart(2, '0')}T11:00:00.000Z`,
        emotionId: EMOTION_IDS.SADNESS,
        ...(belief ? { beliefSystemId: belief.beliefSystemId } : {}),
      })),
    ];
    const candidates = insightCandidates({ entries: withBelief, statements: archiveData.statements, now });
    const thisWeek = candidates.filter(({ timeframe }) => timeframe === ANALYTICS_TIMEFRAMES.LAST_WEEK);
    const allTime = candidates.filter(({ timeframe }) => timeframe === ANALYTICS_TIMEFRAMES.ALL_TIME);
    expect(thisWeek.some(({ id }) => id.endsWith(`:emotion:${EMOTION_IDS.JOY}`))).toBe(true);
    expect(thisWeek.some(({ id }) => id.endsWith(`:belief:${EMOTION_IDS.SADNESS}:${belief?.beliefSystemId}`))).toBe(true);
    expect(thisWeek.some(({ id, tab }) => (
      tab === ANALYTICS_INSIGHT_TABS.GUIDING_BELIEF
      && id.endsWith(`:guiding-belief:${belief?.beliefSystemId}`)
    ))).toBe(true);
    expect(thisWeek.map(({ tab, patternId }) => ({ tab, patternId })))
      .toEqual(allTime.map(({ tab, patternId }) => ({ tab, patternId })));
    expect(new Set(candidates.map(({ id }) => id)).size).toBe(candidates.length);
  });

  it('renews weekly and four-week identities at the local Monday boundary but keeps all-time identities', () => {
    const entries = [1, 2, 3, 8, 9, 10].map((day) => makeCheckIn({
      id: `period-${day}`, at: new Date(2026, 8, day, 12).toISOString(),
      emotionId: EMOTION_IDS.JOY,
      ...(builtInStatement ? { beliefSystemId: builtInStatement.beliefSystemId } : {}),
    }));
    const input = { entries, statements: archiveData.statements };
    const monday = insightCandidates({ ...input, now: new Date(2026, 8, 7, 0) });
    const sunday = insightCandidates({ ...input, now: new Date(2026, 8, 13, 23, 59) });
    const nextMonday = insightCandidates({ ...input, now: new Date(2026, 8, 14, 0) });
    expect(sunday).toEqual(monday);
    for (const timeframe of [ANALYTICS_TIMEFRAMES.LAST_WEEK, ANALYTICS_TIMEFRAMES.LAST_FOUR_WEEKS]) {
      const before = monday.filter((candidate) => candidate.timeframe === timeframe);
      const after = nextMonday.filter((candidate) => candidate.timeframe === timeframe);
      expect(before.length).toBeGreaterThan(0);
      expect(after.length).toBeGreaterThan(0);
      expect(after.every(({ id }) => !before.some((candidate) => candidate.id === id))).toBe(true);
      expect(after.map(({ tab, patternId }) => ({ tab, patternId }))).toEqual(before.map(({ tab, patternId }) => ({ tab, patternId })));
    }
    expect(nextMonday.filter(({ timeframe }) => timeframe === ANALYTICS_TIMEFRAMES.ALL_TIME))
      .toEqual(monday.filter(({ timeframe }) => timeframe === ANALYTICS_TIMEFRAMES.ALL_TIME));
    expect(monday.filter(({ timeframe }) => timeframe === ANALYTICS_TIMEFRAMES.LAST_WEEK)
      .every(({ id }) => id.startsWith(`${ANALYTICS_TIMEFRAMES.LAST_WEEK}:2026-08-31:2026-09-07:`))).toBe(true);
  });

  it('schedules at the next local occurrence, including the same-day boundary', () => {
    const localNow = new Date(2026, 9, 1, 10, 0, 0, 0);
    expect(nextInsightDelivery({ now: localNow, time: { hour: 19, minute: 0 } }).getHours()).toBe(19);
    expect(nextInsightDelivery({ now: localNow, time: { hour: 10, minute: 0 } }).getDate()).toBe(2);
    expect(nextInsightDelivery({ now: localNow, time: { hour: 9, minute: 30 } }).getDate()).toBe(2);
  });

  it('keeps only live pending identities and adds unseen candidates once', () => {
    const candidates = insightCandidates({ ...archiveData, now });
    const [first, second] = candidates;
    if (!first || !second) throw new Error('The decoded synthetic archive should produce multiple candidates.');
    const state: InsightNotificationState = {
      ...initialInsightNotificationState(),
      seen: [first.id],
      pending: { id: 'batch', fireAt: '2026-10-01T19:00:00.000Z', candidates: [second] },
    };
    const pending = pendingInsightCandidates({ state, candidates });
    expect(pending.map(({ id }) => id)).not.toContain(first.id);
    expect(pending.map(({ id }) => id)).toContain(second.id);
    expect(new Set(pending.map(({ id }) => id)).size).toBe(pending.length);
    expect(pendingInsightCandidates({ state, candidates: [second] })).toEqual([second]);
  });
  it('orders timeframe groups with guiding beliefs first and semantic identities sorted within each kind', () => {
    const candidates = insightCandidates({ ...archiveData, now });
    for (const timeframe of Object.values(ANALYTICS_TIMEFRAMES)) {
      const scoped = candidates.filter((candidate) => candidate.timeframe === timeframe);
      const beliefs = scoped.filter(({ tab }) => tab === ANALYTICS_INSIGHT_TABS.GUIDING_BELIEF);
      const patterns = scoped.filter(({ tab }) => tab === ANALYTICS_INSIGHT_TABS.PATTERN);
      expect(scoped).toEqual(beliefs.concat(patterns));
      for (const group of [beliefs, patterns]) {
        expect(group.map(({ id }) => id)).toEqual(group.map(({ id }) => id).toSorted((left, right) => left.localeCompare(right, 'en')));
      }
    }
    expect(candidates.map(({ timeframe }) => timeframe)).toEqual(Object.values(ANALYTICS_TIMEFRAMES)
      .flatMap((timeframe) => candidates.filter((candidate) => candidate.timeframe === timeframe).map(() => timeframe)));
  });

  it('reschedules a future batch to the chosen local time after its stored timestamp drifts', () => {
    const [candidate] = insightCandidates({ ...archiveData, now });
    if (!candidate) throw new Error('Synthetic archive must produce an insight.');
    const localNow = new Date(2026, 9, 1, 10, 0);
    const state: InsightNotificationState = {
      ...initialInsightNotificationState(), enabled: true, time: { hour: 19, minute: 15 },
      pending: { id: 'timezone-batch', fireAt: new Date(2026, 9, 1, 20, 15).toISOString(), candidates: [candidate] },
    };
    const reconciled = reconciledInsightDelivery({ state, now: localNow });
    expect(reconciled.pending?.fireAt).toBe(nextInsightDelivery({ now: localNow, time: state.time }).toISOString());
    expect(reconciled.pending?.id).toBe(state.pending?.id);
    expect(reconciled.pending?.candidates).toEqual(state.pending?.candidates);
    expect(state.pending?.fireAt).toBe(new Date(2026, 9, 1, 20, 15).toISOString());
  });

  it('preserves matching future batches and expired batches so delivery consumption can proceed', () => {
    const [candidate] = insightCandidates({ ...archiveData, now });
    if (!candidate) throw new Error('Synthetic archive must produce an insight.');
    const localNow = new Date(2026, 9, 1, 10, 0);
    const state: InsightNotificationState = {
      ...initialInsightNotificationState(), enabled: true, time: { hour: 19, minute: 15 },
      pending: { id: 'matching-batch', fireAt: new Date(2026, 9, 1, 19, 15).toISOString(), candidates: [candidate] },
    };
    expect(reconciledInsightDelivery({ state, now: localNow })).toBe(state);
    const expired = { ...state, pending: { ...state.pending, id: 'expired-batch', fireAt: new Date(2026, 9, 1, 9, 15).toISOString(), candidates: [candidate] satisfies readonly [typeof candidate] } };
    expect(reconciledInsightDelivery({ state: expired, now: localNow })).toBe(expired);
    const empty = initialInsightNotificationState();
    expect(reconciledInsightDelivery({ state: empty, now: localNow })).toBe(empty);
  });

});
