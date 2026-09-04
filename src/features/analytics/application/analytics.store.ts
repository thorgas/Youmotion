import { createStore } from '@xstate/store';
import * as Schema from 'effect/Schema';

import {
  ANALYTICS_EVENTS,
  ANALYTICS_INSIGHT_TABS,
  ANALYTICS_TIMEFRAMES,
} from '@/constants';

const AnalyticsTimeframeSchema = Schema.Literal(
  ANALYTICS_TIMEFRAMES.LAST_WEEK,
  ANALYTICS_TIMEFRAMES.LAST_FOUR_WEEKS,
  ANALYTICS_TIMEFRAMES.ALL_TIME,
);

const initialContext = {
  insightTab: ANALYTICS_INSIGHT_TABS.GUIDING_BELIEF,
  monthOffset: 0,
  patternIndex: 0,
  timeframe: ANALYTICS_TIMEFRAMES.LAST_WEEK,
};

export const createAnalyticsStore = () => createStore({
  schemas: {
    context: Schema.standardSchemaV1(Schema.Struct({
      insightTab: Schema.Literal(
        ANALYTICS_INSIGHT_TABS.GUIDING_BELIEF,
        ANALYTICS_INSIGHT_TABS.PATTERN,
      ),
      monthOffset: Schema.Int,
      patternIndex: Schema.Int,
      timeframe: AnalyticsTimeframeSchema,
    })),
    events: {
      [ANALYTICS_EVENTS.PREVIOUS_MONTH_REQUESTED]: Schema.standardSchemaV1(Schema.Struct({})),
      [ANALYTICS_EVENTS.NEXT_MONTH_REQUESTED]: Schema.standardSchemaV1(Schema.Struct({})),
      [ANALYTICS_EVENTS.CURRENT_MONTH_REQUESTED]: Schema.standardSchemaV1(Schema.Struct({})),
      [ANALYTICS_EVENTS.TIMEFRAME_SELECTED]: Schema.standardSchemaV1(Schema.Struct({
        timeframe: AnalyticsTimeframeSchema,
      })),
      [ANALYTICS_EVENTS.INSIGHT_TAB_SELECTED]: Schema.standardSchemaV1(Schema.Struct({
        tab: Schema.Literal(
          ANALYTICS_INSIGHT_TABS.GUIDING_BELIEF,
          ANALYTICS_INSIGHT_TABS.PATTERN,
        ),
      })),
      [ANALYTICS_EVENTS.NEXT_PATTERN_REQUESTED]: Schema.standardSchemaV1(Schema.Struct({
        patternCount: Schema.Int,
      })),
    },
  },
  context: initialContext,
  on: {
    [ANALYTICS_EVENTS.PREVIOUS_MONTH_REQUESTED]: (context) => ({
      ...context,
      monthOffset: context.monthOffset - 1,
    }),
    [ANALYTICS_EVENTS.NEXT_MONTH_REQUESTED]: (context) => ({
      ...context,
      monthOffset: Math.min(context.monthOffset + 1, 0),
    }),
    [ANALYTICS_EVENTS.CURRENT_MONTH_REQUESTED]: (context) => ({
      ...context,
      monthOffset: 0,
    }),
    [ANALYTICS_EVENTS.TIMEFRAME_SELECTED]: (context, event) => ({
      ...context,
      insightTab: ANALYTICS_INSIGHT_TABS.GUIDING_BELIEF,
      monthOffset: 0,
      patternIndex: 0,
      timeframe: event.timeframe,
    }),
    [ANALYTICS_EVENTS.INSIGHT_TAB_SELECTED]: (context, event) => ({
      ...context,
      insightTab: event.tab,
    }),
    [ANALYTICS_EVENTS.NEXT_PATTERN_REQUESTED]: (context, event) => ({
      ...context,
      patternIndex: event.patternCount > 1
        ? (context.patternIndex + 1) % event.patternCount
        : 0,
    }),
  },
});
