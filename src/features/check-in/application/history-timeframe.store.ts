import { createStore } from '@xstate/store';
import * as Schema from 'effect/Schema';

import {
  ANALYTICS_TIMEFRAMES,
  HISTORY_EVENTS,
} from '@/constants';

const HistoryTimeframeSchema = Schema.Literal(
  ANALYTICS_TIMEFRAMES.LAST_WEEK,
  ANALYTICS_TIMEFRAMES.LAST_FOUR_WEEKS,
  ANALYTICS_TIMEFRAMES.ALL_TIME,
);

export const historyTimeframeStore = createStore({
  schemas: {
    context: Schema.standardSchemaV1(Schema.Struct({
      timeframe: HistoryTimeframeSchema,
    })),
    events: {
      [HISTORY_EVENTS.TIMEFRAME_SELECTED]: Schema.standardSchemaV1(Schema.Struct({
        timeframe: HistoryTimeframeSchema,
      })),
    },
  },
  context: { timeframe: ANALYTICS_TIMEFRAMES.ALL_TIME },
  on: {
    [HISTORY_EVENTS.TIMEFRAME_SELECTED]: (_context, event) => ({
      timeframe: event.timeframe,
    }),
  },
});
