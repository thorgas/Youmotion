import {
  ANALYTICS_TIMEFRAMES,
  BELIEF_SYSTEM_IDS,
  EMOTION_IDS,
  HISTORY_CONTENT_FILTERS,
  HISTORY_EVENTS,
} from '@/constants';
import { checkInHistoryStore } from '../application/check-in-history.store';
import { historyTimeframeStore } from '../application/history-timeframe.store';
import {
  CheckInId,
  CheckInTimestamp,
  type CheckIn,
} from '../domain/check-in';

function entry(index: number): CheckIn {
  return {
    id: CheckInId.make(`all-history-${index}`),
    createdAt: CheckInTimestamp.make(new Date(2026, 0, index + 1).toISOString()),
    emotionId: EMOTION_IDS.JOY,
    intensity: 0.5,
    level: 2,
    note: '',
  };
}

describe('check-in history store', () => {
  beforeEach(() => {
    checkInHistoryStore.trigger.hydrated({ entries: [] });
    historyTimeframeStore.trigger[HISTORY_EVENTS.FILTERS_CLEARED]({});
  });

  it('keeps every recorded moment in memory', () => {
    Array.from({ length: 35 }, (_, index) => entry(index)).forEach((checkIn) => {
      checkInHistoryStore.trigger.recorded({ entry: checkIn });
    });

    expect(checkInHistoryStore.getSnapshot().context.entries).toHaveLength(35);
  });

  it('keeps the history timeframe separate and defaults it to all time', () => {
    expect(historyTimeframeStore.getSnapshot().context.timeframe).toBe(
      ANALYTICS_TIMEFRAMES.ALL_TIME,
    );

    historyTimeframeStore.trigger[HISTORY_EVENTS.TIMEFRAME_SELECTED]({
      timeframe: ANALYTICS_TIMEFRAMES.LAST_WEEK,
    });

    expect(historyTimeframeStore.getSnapshot().context.timeframe).toBe(
      ANALYTICS_TIMEFRAMES.LAST_WEEK,
    );
  });

  it('turns an Analytics belief into ordinary, clearable History filters', () => {
    historyTimeframeStore.trigger[HISTORY_EVENTS.BELIEF_FILTER_SELECTED]({
      beliefSystemId: BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING,
      timeframe: ANALYTICS_TIMEFRAMES.LAST_WEEK,
    });

    expect(historyTimeframeStore.getSnapshot().context).toEqual({
      beliefSystemId: BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING,
      content: HISTORY_CONTENT_FILTERS.BELIEFS,
      emotionId: null,
      filtersOpen: true,
      query: '',
      timeframe: ANALYTICS_TIMEFRAMES.LAST_WEEK,
    });
    historyTimeframeStore.trigger[HISTORY_EVENTS.FILTERS_CLEARED]({});
    expect(historyTimeframeStore.getSnapshot().context).toEqual({
      beliefSystemId: null,
      content: HISTORY_CONTENT_FILTERS.ALL,
      emotionId: null,
      filtersOpen: true,
      query: '',
      timeframe: ANALYTICS_TIMEFRAMES.ALL_TIME,
    });
  });
});
