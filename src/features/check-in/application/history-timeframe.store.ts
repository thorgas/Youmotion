import { createStore } from '@xstate/store';
import * as Schema from 'effect/Schema';

import {
  ANALYTICS_TIMEFRAMES,
  HISTORY_EVENTS,
} from '@/constants';
import { CheckInIdListSchema } from '../domain/check-in';

const HistoryTimeframeSchema = Schema.Literal(
  ANALYTICS_TIMEFRAMES.LAST_WEEK,
  ANALYTICS_TIMEFRAMES.LAST_FOUR_WEEKS,
  ANALYTICS_TIMEFRAMES.ALL_TIME,
);

export const historyTimeframeStore = createStore({
  schemas: {
    context: Schema.standardSchemaV1(Schema.Struct({
      evidenceIds: CheckInIdListSchema,
      timeframe: HistoryTimeframeSchema,
    })),
    events: {
      [HISTORY_EVENTS.TIMEFRAME_SELECTED]: Schema.standardSchemaV1(Schema.Struct({
        timeframe: HistoryTimeframeSchema,
      })),
      [HISTORY_EVENTS.EVIDENCE_SELECTED]: Schema.standardSchemaV1(Schema.Struct({
        ids: CheckInIdListSchema,
        timeframe: HistoryTimeframeSchema,
      })),
      [HISTORY_EVENTS.EVIDENCE_CLEARED]: Schema.standardSchemaV1(Schema.Struct({})),
    },
  },
  context: { evidenceIds: [], timeframe: ANALYTICS_TIMEFRAMES.ALL_TIME },
  on: {
    [HISTORY_EVENTS.TIMEFRAME_SELECTED]: (_context, event) => ({
      evidenceIds: [],
      timeframe: event.timeframe,
    }),
    [HISTORY_EVENTS.EVIDENCE_SELECTED]: (_context, event) => ({
      evidenceIds: event.ids,
      timeframe: event.timeframe,
    }),
    [HISTORY_EVENTS.EVIDENCE_CLEARED]: (context) => ({
      ...context,
      evidenceIds: [],
    }),
  },
});
