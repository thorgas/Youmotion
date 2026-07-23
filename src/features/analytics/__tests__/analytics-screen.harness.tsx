import { screen, userEvent } from '@react-native-harness/ui';
import {
  afterEach,
  describe,
  expect,
  render,
  test,
  waitUntil,
} from 'react-native-harness';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';

import {
  ANALYTICS_EVENTS,
  ANALYTICS_TIMEFRAMES,
  APP_LOCALES,
  BELIEF_SYSTEM_IDS,
  EMOTION_IDS,
} from '@/constants';
import {
  CheckInId,
  CheckInTimestamp,
  type CheckIn,
} from '@/features/check-in/domain/check-in';
import { analyticsStore } from '../application/analytics.store';
import { analyticsObservations } from '../domain/check-in-analytics';
import { AnalyticsContent } from '../ui/analytics-screen';

const FIXED_NOW = new Date(2026, 6, 21, 12);
function checkIn({ day, emotionId, id, note = '' }: {
  day: number;
  emotionId: CheckIn['emotionId'];
  id: string;
  note?: string;
}): CheckIn {
  return {
    id: CheckInId.make(id),
    beliefSystemId: emotionId === EMOTION_IDS.FEAR
      ? BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING
      : undefined,
    createdAt: CheckInTimestamp.make(new Date(2026, 6, day, 12).toISOString()),
    emotionId,
    intensity: 0.5,
    level: 2,
    note,
    guidingStatementSnapshot: emotionId === EMOTION_IDS.FEAR
      ? 'I may pause and still be worthy.'
      : undefined,
  };
}

const entries = [
  checkIn({ day: 2, emotionId: EMOTION_IDS.FEAR, id: 'fear-1' }),
  checkIn({ day: 8, emotionId: EMOTION_IDS.FEAR, id: 'fear-2' }),
  checkIn({ day: 15, emotionId: EMOTION_IDS.FEAR, id: 'fear-3', note: 'A demanding day.' }),
  checkIn({ day: 15, emotionId: EMOTION_IDS.JOY, id: 'joy-1' }),
  checkIn({ day: 19, emotionId: EMOTION_IDS.JOY, id: 'joy-2', note: 'Time with friends.' }),
  checkIn({ day: 21, emotionId: EMOTION_IDS.SADNESS, id: 'sadness-1' }),
] satisfies readonly CheckIn[];

function checkInsForBelief({
  beliefSystemId,
  count,
  day,
  emotionId,
  guidingStatementSnapshot,
  month = 6,
  prefix,
}: {
  beliefSystemId: CheckIn['beliefSystemId'];
  count: number;
  day: number;
  emotionId: CheckIn['emotionId'];
  guidingStatementSnapshot: string;
  month?: number;
  prefix: string;
}): readonly CheckIn[] {
  return Array.from({ length: count }, (_, index) => ({
    id: CheckInId.make(`${prefix}-${String(index + 1)}`),
    beliefSystemId,
    createdAt: CheckInTimestamp.make(
      new Date(2026, month, day, 10, index).toISOString(),
    ),
    emotionId,
    guidingStatementSnapshot,
    intensity: 0.5,
    level: 2,
    note: `Moment ${String(index + 1)}`,
  }));
}

const tiedScreenshotShape = [
  ...checkInsForBelief({
    beliefSystemId: BELIEF_SYSTEM_IDS.LOVE_REQUIRES_HELPING,
    count: 7,
    day: 18,
    emotionId: EMOTION_IDS.ANGER,
    guidingStatementSnapshot: 'I may prioritize myself too.',
    prefix: 'previous-saturday-prioritize',
  }),
  ...checkInsForBelief({
    beliefSystemId: BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING,
    count: 7,
    day: 19,
    emotionId: EMOTION_IDS.SADNESS,
    guidingStatementSnapshot: 'I may pause and still be worthy.',
    prefix: 'previous-sunday-pause',
  }),
  ...checkInsForBelief({
    beliefSystemId: BELIEF_SYSTEM_IDS.NO_MISTAKES,
    count: 1,
    day: 19,
    emotionId: EMOTION_IDS.SHAME,
    guidingStatementSnapshot: 'Mistakes help me learn.',
    prefix: 'previous-sunday-learn',
  }),
  ...checkInsForBelief({
    beliefSystemId: BELIEF_SYSTEM_IDS.NO_MISTAKES,
    count: 9,
    day: 20,
    emotionId: EMOTION_IDS.LOVE,
    guidingStatementSnapshot: 'Mistakes help me learn.',
    prefix: 'current-monday',
  }),
  ...checkInsForBelief({
    beliefSystemId: BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING,
    count: 7,
    day: 21,
    emotionId: EMOTION_IDS.JOY,
    guidingStatementSnapshot: 'I may pause and still be worthy.',
    prefix: 'current-tuesday',
  }),
] satisfies readonly CheckIn[];

const timeframeLeitsatzEntries = [
  ...checkInsForBelief({
    beliefSystemId: BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING,
    count: 2,
    day: 18,
    emotionId: EMOTION_IDS.FEAR,
    guidingStatementSnapshot: 'I may pause and still be worthy.',
    prefix: 'last-week-pause',
  }),
  ...checkInsForBelief({
    beliefSystemId: BELIEF_SYSTEM_IDS.NO_MISTAKES,
    count: 1,
    day: 18,
    emotionId: EMOTION_IDS.SHAME,
    guidingStatementSnapshot: 'Mistakes help me learn.',
    prefix: 'last-week-learn',
  }),
  ...checkInsForBelief({
    beliefSystemId: BELIEF_SYSTEM_IDS.NO_MISTAKES,
    count: 3,
    day: 2,
    emotionId: EMOTION_IDS.SHAME,
    guidingStatementSnapshot: 'Mistakes help me learn.',
    prefix: 'four-weeks-learn',
  }),
  ...checkInsForBelief({
    beliefSystemId: BELIEF_SYSTEM_IDS.LOVE_REQUIRES_HELPING,
    count: 5,
    day: 1,
    emotionId: EMOTION_IDS.LOVE,
    guidingStatementSnapshot: 'I am loved without earning it.',
    month: 4,
    prefix: 'all-time-love',
  }),
] satisfies readonly CheckIn[];

afterEach(() => {
  analyticsStore.trigger[ANALYTICS_EVENTS.TIMEFRAME_SELECTED]({
    timeframe: ANALYTICS_TIMEFRAMES.LAST_WEEK,
  });
});

describe('analytics on the device runtime', () => {
  test('renders the populated constellation on the device runtime', async () => {
    expect(analyticsObservations(entries)).toHaveLength(3);
    await render(
      <GestureHandlerRootView style={styles.root}>
        <AnalyticsContent
          entries={entries}
          locale={APP_LOCALES.ENGLISH}
          now={FIXED_NOW}
          statements={[{
            kind: 'built-in',
            beliefSystemId: BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING,
            guidingStatement: 'I may pause and still be worthy.',
          }]}
        />
      </GestureHandlerRootView>,
    );

    expect(
      await screen.findByAccessibilityLabel(
        'July 15, 2026. 2 recorded moments: Joy 1, Fear 1.',
      ),
    ).not.toBeNull();
  });

  test('renders every tied top Leitsatz instead of hiding the card', async () => {
    expect(tiedScreenshotShape).toHaveLength(31);
    await render(
      <GestureHandlerRootView style={styles.root}>
        <AnalyticsContent
          entries={tiedScreenshotShape}
          locale={APP_LOCALES.ENGLISH}
          now={FIXED_NOW}
          statements={[]}
        />
      </GestureHandlerRootView>,
    );

    expect(
      await screen.findByTestId(
        `analytics-top-leitsatz-${BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING}`,
      ),
    ).not.toBeNull();
    expect(
      await screen.findByTestId(
        `analytics-top-leitsatz-${BELIEF_SYSTEM_IDS.LOVE_REQUIRES_HELPING}`,
      ),
    ).not.toBeNull();
  });

  test('recalculates the top Leitsatz when the selected timeframe changes', async () => {
    analyticsStore.trigger[ANALYTICS_EVENTS.TIMEFRAME_SELECTED]({
      timeframe: ANALYTICS_TIMEFRAMES.LAST_WEEK,
    });
    await render(
      <GestureHandlerRootView style={styles.root}>
        <AnalyticsContent
          entries={timeframeLeitsatzEntries}
          locale={APP_LOCALES.ENGLISH}
          now={FIXED_NOW}
          statements={[]}
        />
      </GestureHandlerRootView>,
    );

    expect(await screen.findByTestId(
      `analytics-top-leitsatz-${BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING}`,
    )).not.toBeNull();
    expect(await screen.findByAccessibilityLabel(
      "LAST WEEK'S GUIDING BELIEF",
    )).not.toBeNull();

    await userEvent.press(await screen.findByTestId('analytics-timeframe-four-weeks'));
    expect(await screen.findByTestId(
      `analytics-top-leitsatz-${BELIEF_SYSTEM_IDS.NO_MISTAKES}`,
    )).not.toBeNull();
    expect(await screen.findByAccessibilityLabel(
      "LAST 4 WEEKS' GUIDING BELIEF",
    )).not.toBeNull();
    await waitUntil(() => screen.queryByTestId(
      `analytics-top-leitsatz-${BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING}`,
    ) === null);

    await userEvent.press(await screen.findByTestId('analytics-timeframe-all'));
    expect(await screen.findByTestId(
      `analytics-top-leitsatz-${BELIEF_SYSTEM_IDS.LOVE_REQUIRES_HELPING}`,
    )).not.toBeNull();
    expect(await screen.findByAccessibilityLabel(
      'ALL-TIME GUIDING BELIEF',
    )).not.toBeNull();
    expect(await screen.findByAccessibilityLabel(
      'Selected 5 times · All recorded moments',
    )).not.toBeNull();
  });
});

const styles = StyleSheet.create({
  root: { flex: 1 },
});
