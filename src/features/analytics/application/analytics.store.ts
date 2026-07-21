import { createStore } from '@xstate/store';
import * as Schema from 'effect/Schema';

import {
  ANALYTICS_EVENTS,
  ANALYTICS_TIMEFRAMES,
} from '@/constants';

const AnalyticsTimeframeSchema = Schema.Literal(
  ANALYTICS_TIMEFRAMES.LAST_WEEK,
  ANALYTICS_TIMEFRAMES.LAST_FOUR_WEEKS,
  ANALYTICS_TIMEFRAMES.ALL_TIME,
);

const initialContext = {
  monthOffset: 0,
  timeframe: ANALYTICS_TIMEFRAMES.LAST_WEEK,
};

export const analyticsStore = createStore({
  schemas: {
    context: Schema.standardSchemaV1(Schema.Struct({
      monthOffset: Schema.Int,
      timeframe: AnalyticsTimeframeSchema,
    })),
    events: {
      [ANALYTICS_EVENTS.PREVIOUS_MONTH_REQUESTED]: Schema.standardSchemaV1(Schema.Struct({})),
      [ANALYTICS_EVENTS.NEXT_MONTH_REQUESTED]: Schema.standardSchemaV1(Schema.Struct({})),
      [ANALYTICS_EVENTS.CURRENT_MONTH_REQUESTED]: Schema.standardSchemaV1(Schema.Struct({})),
      [ANALYTICS_EVENTS.TIMEFRAME_SELECTED]: Schema.standardSchemaV1(Schema.Struct({
        timeframe: AnalyticsTimeframeSchema,
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
      monthOffset: 0,
      timeframe: event.timeframe,
    }),
  },
});
