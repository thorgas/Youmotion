import { createStore } from '@xstate/store';
import * as Schema from 'effect/Schema';

import {
  ANALYTICS_TIMEFRAMES,
  HISTORY_CONTENT_FILTERS,
  HISTORY_EVENTS,
} from '@/constants';
import { EmotionId } from '../domain/check-in';
import { BeliefSystemId } from '@/features/beliefs/domain/belief-statement';

const HistoryTimeframeSchema = Schema.Literal(
  ANALYTICS_TIMEFRAMES.LAST_WEEK,
  ANALYTICS_TIMEFRAMES.LAST_FOUR_WEEKS,
  ANALYTICS_TIMEFRAMES.ALL_TIME,
);

const HistoryContentFilterSchema = Schema.Literal(
  HISTORY_CONTENT_FILTERS.ALL,
  HISTORY_CONTENT_FILTERS.NOTES,
  HISTORY_CONTENT_FILTERS.BELIEFS,
);

export const createHistoryTimeframeStore = () => createStore({
  schemas: {
    context: Schema.standardSchemaV1(Schema.Struct({
      beliefSystemId: Schema.NullOr(BeliefSystemId),
      content: HistoryContentFilterSchema,
      emotionId: Schema.NullOr(EmotionId),
      filtersOpen: Schema.Boolean,
      query: Schema.String,
      timeframe: HistoryTimeframeSchema,
    })),
    events: {
      [HISTORY_EVENTS.TIMEFRAME_SELECTED]: Schema.standardSchemaV1(Schema.Struct({
        timeframe: HistoryTimeframeSchema,
      })),
      [HISTORY_EVENTS.QUERY_CHANGED]: Schema.standardSchemaV1(Schema.Struct({
        query: Schema.String,
      })),
      [HISTORY_EVENTS.FILTERS_TOGGLED]: Schema.standardSchemaV1(Schema.Struct({})),
      [HISTORY_EVENTS.EMOTION_FILTER_SELECTED]: Schema.standardSchemaV1(Schema.Struct({
        emotionId: Schema.NullOr(EmotionId),
      })),
      [HISTORY_EVENTS.CONTENT_FILTER_SELECTED]: Schema.standardSchemaV1(Schema.Struct({
        content: HistoryContentFilterSchema,
      })),
      [HISTORY_EVENTS.BELIEF_FILTER_SELECTED]: Schema.standardSchemaV1(Schema.Struct({
        beliefSystemId: BeliefSystemId,
        timeframe: HistoryTimeframeSchema,
      })),
      [HISTORY_EVENTS.FILTERS_CLEARED]: Schema.standardSchemaV1(Schema.Struct({})),
    },
  },
  context: {
    beliefSystemId: null,
    content: HISTORY_CONTENT_FILTERS.ALL,
    emotionId: null,
    filtersOpen: false,
    query: '',
    timeframe: ANALYTICS_TIMEFRAMES.ALL_TIME,
  },
  on: {
    [HISTORY_EVENTS.TIMEFRAME_SELECTED]: (context, event) => ({
      ...context,
      timeframe: event.timeframe,
    }),
    [HISTORY_EVENTS.QUERY_CHANGED]: (context, event) => ({
      ...context,
      query: event.query,
    }),
    [HISTORY_EVENTS.FILTERS_TOGGLED]: (context) => ({
      ...context,
      filtersOpen: !context.filtersOpen,
    }),
    [HISTORY_EVENTS.EMOTION_FILTER_SELECTED]: (context, event) => ({
      ...context,
      emotionId: event.emotionId,
    }),
    [HISTORY_EVENTS.CONTENT_FILTER_SELECTED]: (context, event) => ({
      ...context,
      content: event.content,
    }),
    [HISTORY_EVENTS.BELIEF_FILTER_SELECTED]: (_context, event) => ({
      beliefSystemId: event.beliefSystemId,
      content: HISTORY_CONTENT_FILTERS.BELIEFS,
      emotionId: null,
      filtersOpen: true,
      query: '',
      timeframe: event.timeframe,
    }),
    [HISTORY_EVENTS.FILTERS_CLEARED]: (context) => ({
      beliefSystemId: null,
      content: HISTORY_CONTENT_FILTERS.ALL,
      emotionId: null,
      filtersOpen: context.filtersOpen,
      query: '',
      timeframe: ANALYTICS_TIMEFRAMES.ALL_TIME,
    }),
  },
});
