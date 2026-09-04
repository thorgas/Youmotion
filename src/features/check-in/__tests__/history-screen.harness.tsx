import {
  afterEach,
  describe,
  expect,
  render,
  test,
  waitUntil,
} from 'react-native-harness';
import { screen, userEvent } from '@react-native-harness/ui';
import { useSelector } from '@xstate/store-react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import {
  ANALYTICS_TIMEFRAMES,
  APP_LOCALES,
  EMOTION_LABEL_MODES,
  HISTORY_EVENTS,
} from '@/constants';
import { AnalyticsTimeframeSelector } from '@/features/analytics/ui/analytics-timeframe-selector';
import { appSettingsStore } from '@/app-stores';
import { AppLocaleProvider } from '@/localization/app-locale-provider';
import { historyTimeframeStore } from '@/app-stores';

const FIXED_NOW = new Date(2026, 6, 21, 12);
const _selectTimeframe = (state: ReturnType<typeof historyTimeframeStore.getSnapshot>) => (
  state.context.timeframe
);
const _selectLastWeek = () => {
  historyTimeframeStore.trigger[HISTORY_EVENTS.TIMEFRAME_SELECTED]({
    timeframe: ANALYTICS_TIMEFRAMES.LAST_WEEK,
  });
};
const _selectLastFourWeeks = () => {
  historyTimeframeStore.trigger[HISTORY_EVENTS.TIMEFRAME_SELECTED]({
    timeframe: ANALYTICS_TIMEFRAMES.LAST_FOUR_WEEKS,
  });
};
const _selectAllTime = () => {
  historyTimeframeStore.trigger[HISTORY_EVENTS.TIMEFRAME_SELECTED]({
    timeframe: ANALYTICS_TIMEFRAMES.ALL_TIME,
  });
};

function HistoryTimeframeHarness() {
  const timeframe = useSelector(historyTimeframeStore, _selectTimeframe);
  return (
    <AnalyticsTimeframeSelector
      locale={APP_LOCALES.ENGLISH}
      now={FIXED_NOW}
      onAllTimePress={_selectAllTime}
      onFourWeeksPress={_selectLastFourWeeks}
      onLastWeekPress={_selectLastWeek}
      timeframe={timeframe}
    />
  );
}

afterEach(() => {
  _selectAllTime();
});

describe('history timeframe on the device runtime', () => {
  test('changes the native control from its all-time default', async () => {
    appSettingsStore.trigger.hydrated({
      settings: {
        locale: APP_LOCALES.ENGLISH,
        emotionLabelMode: EMOTION_LABEL_MODES.EMOJI,
        onboardingCompleted: true,
      },
    });
    await render(
      <GestureHandlerRootView>
        <AppLocaleProvider>
          <HistoryTimeframeHarness />
        </AppLocaleProvider>
      </GestureHandlerRootView>,
    );

    await screen.findByTestId('analytics-timeframe-range');
    expect(historyTimeframeStore.getSnapshot().context.timeframe).toBe(
      ANALYTICS_TIMEFRAMES.ALL_TIME,
    );
    await userEvent.press(await screen.findByTestId('analytics-timeframe-last-week'));
    await waitUntil(() => (
      historyTimeframeStore.getSnapshot().context.timeframe
        === ANALYTICS_TIMEFRAMES.LAST_WEEK
    ));
  });
});
