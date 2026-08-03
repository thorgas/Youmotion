import {
  ANALYTICS_EVENTS,
  ANALYTICS_INSIGHT_TABS,
  ANALYTICS_TIMEFRAMES,
} from '@/constants';
import { analyticsStore } from '../application/analytics.store';

describe('analytics calendar store', () => {
  beforeEach(() => {
    analyticsStore.trigger[ANALYTICS_EVENTS.TIMEFRAME_SELECTED]({
      timeframe: ANALYTICS_TIMEFRAMES.LAST_WEEK,
    });
    analyticsStore.trigger[ANALYTICS_EVENTS.CURRENT_MONTH_REQUESTED]({});
  });

  it('defaults to last week and resets the month when the timeframe changes', () => {
    expect(analyticsStore.getSnapshot().context.timeframe).toBe(
      ANALYTICS_TIMEFRAMES.LAST_WEEK,
    );
    analyticsStore.trigger[ANALYTICS_EVENTS.PREVIOUS_MONTH_REQUESTED]({});
    analyticsStore.trigger[ANALYTICS_EVENTS.NEXT_PATTERN_REQUESTED]({ patternCount: 2 });
    analyticsStore.trigger[ANALYTICS_EVENTS.TIMEFRAME_SELECTED]({
      timeframe: ANALYTICS_TIMEFRAMES.ALL_TIME,
    });
    expect(analyticsStore.getSnapshot().context).toEqual({
      insightTab: ANALYTICS_INSIGHT_TABS.GUIDING_BELIEF,
      monthOffset: 0,
      patternIndex: 0,
      timeframe: ANALYTICS_TIMEFRAMES.ALL_TIME,
    });
  });

  it('cycles through available patterns and stays at zero for a single pattern', () => {
    analyticsStore.trigger[ANALYTICS_EVENTS.NEXT_PATTERN_REQUESTED]({ patternCount: 2 });
    expect(analyticsStore.getSnapshot().context.patternIndex).toBe(1);

    analyticsStore.trigger[ANALYTICS_EVENTS.NEXT_PATTERN_REQUESTED]({ patternCount: 2 });
    expect(analyticsStore.getSnapshot().context.patternIndex).toBe(0);

    analyticsStore.trigger[ANALYTICS_EVENTS.NEXT_PATTERN_REQUESTED]({ patternCount: 1 });
    expect(analyticsStore.getSnapshot().context.patternIndex).toBe(0);
  });

  it('returns the hero to its guiding belief when the timeframe changes', () => {
    analyticsStore.trigger[ANALYTICS_EVENTS.INSIGHT_TAB_SELECTED]({
      tab: ANALYTICS_INSIGHT_TABS.PATTERN,
    });
    expect(analyticsStore.getSnapshot().context.insightTab).toBe(
      ANALYTICS_INSIGHT_TABS.PATTERN,
    );

    analyticsStore.trigger[ANALYTICS_EVENTS.TIMEFRAME_SELECTED]({
      timeframe: ANALYTICS_TIMEFRAMES.LAST_FOUR_WEEKS,
    });
    expect(analyticsStore.getSnapshot().context.insightTab).toBe(
      ANALYTICS_INSIGHT_TABS.GUIDING_BELIEF,
    );
  });

  it('moves between past months without entering the future', () => {
    analyticsStore.trigger[ANALYTICS_EVENTS.PREVIOUS_MONTH_REQUESTED]({});
    analyticsStore.trigger[ANALYTICS_EVENTS.PREVIOUS_MONTH_REQUESTED]({});
    expect(analyticsStore.getSnapshot().context.monthOffset).toBe(-2);

    analyticsStore.trigger[ANALYTICS_EVENTS.NEXT_MONTH_REQUESTED]({});
    analyticsStore.trigger[ANALYTICS_EVENTS.NEXT_MONTH_REQUESTED]({});
    analyticsStore.trigger[ANALYTICS_EVENTS.NEXT_MONTH_REQUESTED]({});
    expect(analyticsStore.getSnapshot().context.monthOffset).toBe(0);
  });
});
