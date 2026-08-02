import {
  ANALYTICS_EVENTS,
  ANALYTICS_TIMEFRAMES,
} from '@/constants';
import { analyticsStore } from '../application/analytics.store';

describe('analytics calendar store', () => {
  beforeEach(() => {
    analyticsStore.trigger[ANALYTICS_EVENTS.TIMEFRAME_SELECTED]({
      timeframe: ANALYTICS_TIMEFRAMES.LAST_WEEK,
    });
    analyticsStore.trigger[ANALYTICS_EVENTS.CURRENT_MONTH_REQUESTED]({});
    analyticsStore.trigger[ANALYTICS_EVENTS.INSIGHT_RESTORED]({});
  });

  it('defaults to last week and resets the month when the timeframe changes', () => {
    expect(analyticsStore.getSnapshot().context.timeframe).toBe(
      ANALYTICS_TIMEFRAMES.LAST_WEEK,
    );
    analyticsStore.trigger[ANALYTICS_EVENTS.PREVIOUS_MONTH_REQUESTED]({});
    analyticsStore.trigger[ANALYTICS_EVENTS.TIMEFRAME_SELECTED]({
      timeframe: ANALYTICS_TIMEFRAMES.ALL_TIME,
    });
    expect(analyticsStore.getSnapshot().context).toEqual({
      dismissedInsightKey: null,
      monthOffset: 0,
      timeframe: ANALYTICS_TIMEFRAMES.ALL_TIME,
    });
  });

  it('dismisses only the current deterministic insight until restored', () => {
    analyticsStore.trigger[ANALYTICS_EVENTS.INSIGHT_DISMISSED]({ key: 'belief:a:b' });
    expect(analyticsStore.getSnapshot().context.dismissedInsightKey).toBe('belief:a:b');

    analyticsStore.trigger[ANALYTICS_EVENTS.INSIGHT_RESTORED]({});
    expect(analyticsStore.getSnapshot().context.dismissedInsightKey).toBeNull();
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
