import {
  ANALYTICS_TIMEFRAMES,
  BELIEF_SYSTEM_IDS,
  EMOTION_IDS,
} from '@/constants';
import {
  CheckInId,
  CheckInTimestamp,
  type CheckIn,
} from '@/features/check-in/domain/check-in';
import {
  analyticsInsightKey,
  analyticsObservations,
  emotionFrequencies,
  primaryAnalyticsInsight,
} from '../domain/check-in-analytics';
import {
  calendarEmotionFrequencies,
  calendarMonth,
  monthAtOffset,
  periodCalendarDays,
} from '../domain/analytics-calendar';
import {
  analyticsDateRange,
  entriesForAnalyticsTimeframe,
  topLeitsaetzeForTimeframe,
} from '../domain/analytics-timeframe';

function checkIn({ beliefSystemId, day, emotionId, guidingStatementSnapshot, id }: {
  beliefSystemId?: CheckIn['beliefSystemId'];
  day: number;
  emotionId: CheckIn['emotionId'];
  guidingStatementSnapshot?: string;
  id: string;
}): CheckIn {
  return {
    id: CheckInId.make(id),
    createdAt: CheckInTimestamp.make(new Date(2026, 6, day, 12).toISOString()),
    emotionId,
    intensity: 0.5,
    level: 2,
    note: '',
    ...(beliefSystemId === undefined ? {} : { beliefSystemId }),
    ...(guidingStatementSnapshot === undefined ? {} : { guidingStatementSnapshot }),
  };
}

describe('check-in analytics', () => {
  it('counts every stored emotion in the Pulse order', () => {
    const entries = [
      checkIn({ day: 1, emotionId: EMOTION_IDS.FEAR, id: 'fear-1' }),
      checkIn({ day: 2, emotionId: EMOTION_IDS.JOY, id: 'joy-1' }),
      checkIn({ day: 3, emotionId: EMOTION_IDS.FEAR, id: 'fear-2' }),
    ];

    const frequencies = emotionFrequencies(entries);

    expect(frequencies[0]).toEqual({ emotionId: EMOTION_IDS.JOY, count: 1 });
    expect(frequencies.at(-1)).toEqual({ emotionId: EMOTION_IDS.FEAR, count: 2 });
    expect(frequencies.reduce((total, frequency) => total + frequency.count, 0)).toBe(3);
  });

  it('groups every moment into its local calendar day', () => {
    const entries = [
      checkIn({ day: 5, emotionId: EMOTION_IDS.JOY, id: 'july-5-joy' }),
      checkIn({ day: 5, emotionId: EMOTION_IDS.FEAR, id: 'july-5-fear' }),
      checkIn({ day: 21, emotionId: EMOTION_IDS.SADNESS, id: 'july-21' }),
    ];

    const result = calendarMonth({ entries, month: new Date(2026, 6, 1) });

    expect(result.leadingDayCount).toBe(2);
    expect(result.days).toHaveLength(31);
    expect(result.days[4]?.entries).toHaveLength(2);
    expect(result.days[20]?.entries).toHaveLength(1);
  });

  it('shows every daily emotion once, ranked by count with Pulse-order ties', () => {
    const entries = [
      checkIn({ day: 5, emotionId: EMOTION_IDS.FEAR, id: 'fear-1' }),
      checkIn({ day: 5, emotionId: EMOTION_IDS.JOY, id: 'joy-1' }),
      checkIn({ day: 5, emotionId: EMOTION_IDS.FEAR, id: 'fear-2' }),
      checkIn({ day: 5, emotionId: EMOTION_IDS.ANGER, id: 'anger-1' }),
      checkIn({ day: 5, emotionId: EMOTION_IDS.JOY, id: 'joy-2' }),
      checkIn({ day: 5, emotionId: EMOTION_IDS.SADNESS, id: 'sadness-1' }),
    ];

    expect(calendarEmotionFrequencies(entries)).toEqual([
      { emotionId: EMOTION_IDS.JOY, count: 2 },
      { emotionId: EMOTION_IDS.FEAR, count: 2 },
      { emotionId: EMOTION_IDS.SADNESS, count: 1 },
      { emotionId: EMOTION_IDS.ANGER, count: 1 },
    ]);
  });

  it('keeps all seven daily emotion colors visible', () => {
    const entries = Object.values(EMOTION_IDS).map((emotionId, index) => checkIn({
      day: 5,
      emotionId,
      id: `emotion-${index}`,
    }));

    expect(calendarEmotionFrequencies(entries)).toHaveLength(7);
  });

  it('never resolves a calendar offset into the future', () => {
    const now = new Date(2026, 6, 21);

    expect(monthAtOffset({ now, offset: -2 }).getMonth()).toBe(4);
    expect(monthAtOffset({ now, offset: 3 }).getMonth()).toBe(6);
  });

  it('defaults bounded analytics to the previous completed local week', () => {
    const now = new Date(2026, 6, 21, 12);
    const entries = [
      checkIn({ day: 12, emotionId: EMOTION_IDS.JOY, id: 'before' }),
      checkIn({ day: 13, emotionId: EMOTION_IDS.FEAR, id: 'monday' }),
      checkIn({ day: 19, emotionId: EMOTION_IDS.SADNESS, id: 'sunday' }),
      checkIn({ day: 20, emotionId: EMOTION_IDS.LOVE, id: 'current-week' }),
    ];

    const range = analyticsDateRange({
      now,
      timeframe: ANALYTICS_TIMEFRAMES.LAST_WEEK,
    });
    const filtered = entriesForAnalyticsTimeframe({
      entries,
      now,
      timeframe: ANALYTICS_TIMEFRAMES.LAST_WEEK,
    });

    expect(range.start).toEqual(new Date(2026, 6, 13));
    expect(range.end).toEqual(new Date(2026, 6, 20));
    expect(filtered.map(({ id }) => id)).toEqual(['monday', 'sunday']);
    expect(periodCalendarDays({ entries: filtered, range })).toHaveLength(7);
  });

  it('returns a unique top Leitsatz from last week and prefers its saved wording', () => {
    const entries = [
      checkIn({
        beliefSystemId: BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING,
        day: 13,
        emotionId: EMOTION_IDS.FEAR,
        guidingStatementSnapshot: 'I may pause and still be worthy.',
        id: 'pause-1',
      }),
      checkIn({
        beliefSystemId: BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING,
        day: 19,
        emotionId: EMOTION_IDS.JOY,
        guidingStatementSnapshot: 'Rest belongs in my life.',
        id: 'pause-2',
      }),
      checkIn({
        beliefSystemId: BELIEF_SYSTEM_IDS.NO_MISTAKES,
        day: 18,
        emotionId: EMOTION_IDS.SHAME,
        id: 'mistake-1',
      }),
    ];

    const result = topLeitsaetzeForTimeframe({
      entries,
      now: new Date(2026, 6, 21, 12),
      statements: [{
        kind: 'built-in',
        beliefSystemId: BELIEF_SYSTEM_IDS.NO_MISTAKES,
        guidingStatement: 'Mistakes help me learn.',
      }],
      timeframe: ANALYTICS_TIMEFRAMES.LAST_WEEK,
    });

    expect(result?.leitsaetze[0]).toMatchObject({
      beliefSystemId: BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING,
      count: 2,
      guidingStatement: 'Rest belongs in my life.',
    });
  });

  it('returns all equally frequent top Leitsätze instead of hiding a tie', () => {
    const entries = [
      checkIn({
        beliefSystemId: BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING,
        day: 13,
        emotionId: EMOTION_IDS.FEAR,
        guidingStatementSnapshot: 'I may pause.',
        id: 'pause',
      }),
      checkIn({
        beliefSystemId: BELIEF_SYSTEM_IDS.NO_MISTAKES,
        day: 19,
        emotionId: EMOTION_IDS.SHAME,
        guidingStatementSnapshot: 'I may learn.',
        id: 'learn',
      }),
    ];

    const result = topLeitsaetzeForTimeframe({
      entries,
      now: new Date(2026, 6, 21, 12),
      statements: [],
      timeframe: ANALYTICS_TIMEFRAMES.LAST_WEEK,
    });

    expect(result?.additionalCount).toBe(0);
    expect(result?.leitsaetze).toHaveLength(2);
    expect(result?.leitsaetze.map(({ guidingStatement }) => guidingStatement)).toEqual([
      'I may learn.',
      'I may pause.',
    ]);
  });

  it('recalculates the top Leitsatz for each selected timeframe', () => {
    const lastWeekEntries = [
      checkIn({
        beliefSystemId: BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING,
        day: 18,
        emotionId: EMOTION_IDS.FEAR,
        guidingStatementSnapshot: 'I may pause.',
        id: 'pause-1',
      }),
      checkIn({
        beliefSystemId: BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING,
        day: 19,
        emotionId: EMOTION_IDS.FEAR,
        guidingStatementSnapshot: 'I may pause.',
        id: 'pause-2',
      }),
    ];
    const earlierEntries = [1, 2, 3].map((index) => checkIn({
      beliefSystemId: BELIEF_SYSTEM_IDS.NO_MISTAKES,
      day: index,
      emotionId: EMOTION_IDS.SHAME,
      guidingStatementSnapshot: 'I may learn.',
      id: `learn-${String(index)}`,
    }));
    const entries = earlierEntries.concat(lastWeekEntries);
    const now = new Date(2026, 6, 21, 12);

    const lastWeek = topLeitsaetzeForTimeframe({
      entries,
      now,
      statements: [],
      timeframe: ANALYTICS_TIMEFRAMES.LAST_WEEK,
    });
    const lastFourWeeks = topLeitsaetzeForTimeframe({
      entries,
      now,
      statements: [],
      timeframe: ANALYTICS_TIMEFRAMES.LAST_FOUR_WEEKS,
    });

    expect(lastWeek?.leitsaetze[0]?.beliefSystemId).toBe(
      BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING,
    );
    expect(lastFourWeeks?.leitsaetze[0]?.beliefSystemId).toBe(
      BELIEF_SYSTEM_IDS.NO_MISTAKES,
    );
    expect(lastFourWeeks?.timeframe).toBe(ANALYTICS_TIMEFRAMES.LAST_FOUR_WEEKS);
  });

  it('returns at most three factual observations without comparing intensities', () => {
    const entries = [
      checkIn({ beliefSystemId: BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING, day: 1, emotionId: EMOTION_IDS.FEAR, id: 'fear-1' }),
      checkIn({ beliefSystemId: BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING, day: 1, emotionId: EMOTION_IDS.FEAR, id: 'fear-2' }),
      checkIn({ beliefSystemId: BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING, day: 2, emotionId: EMOTION_IDS.FEAR, id: 'fear-3' }),
      checkIn({ day: 3, emotionId: EMOTION_IDS.JOY, id: 'joy-1' }),
    ];

    const observations = analyticsObservations(entries);

    expect(observations).toHaveLength(3);
    expect(observations[0]).toEqual({ kind: 'history', dayCount: 3, momentCount: 4 });
    expect(observations[1]).toEqual({
      kind: 'emotion',
      emotionId: EMOTION_IDS.FEAR,
      count: 3,
      supportingIds: ['fear-1', 'fear-2', 'fear-3'],
    });
    expect(observations[2]).toEqual({
      kind: 'belief',
      beliefSystemId: BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING,
      emotionId: EMOTION_IDS.FEAR,
      count: 3,
      supportingIds: ['fear-1', 'fear-2', 'fear-3'],
    });
  });

  it('requires three moments and prefers a recurring belief pair as the primary insight', () => {
    const entries = [
      checkIn({ beliefSystemId: BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING, day: 1, emotionId: EMOTION_IDS.FEAR, id: 'fear-1' }),
      checkIn({ beliefSystemId: BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING, day: 2, emotionId: EMOTION_IDS.FEAR, id: 'fear-2' }),
      checkIn({ day: 3, emotionId: EMOTION_IDS.FEAR, id: 'fear-3' }),
    ];

    expect(primaryAnalyticsInsight(entries.slice(0, 2))).toBeNull();
    const insight = primaryAnalyticsInsight(entries);
    expect(insight).toEqual({
      kind: 'belief',
      beliefSystemId: BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING,
      emotionId: EMOTION_IDS.FEAR,
      count: 2,
      supportingIds: ['fear-1', 'fear-2'],
    });
    if (!insight) throw new Error('Three recurring moments must produce an insight.');
    expect(analyticsInsightKey(insight)).toBe('belief:fear-1:fear-2');
  });
});
