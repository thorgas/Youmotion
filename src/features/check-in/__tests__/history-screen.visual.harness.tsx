import { screen } from '@react-native-harness/ui';
import {
  afterEach,
  describe,
  expect,
  render,
  test,
} from 'react-native-harness';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Platform, StyleSheet } from 'react-native';

import {
  ANALYTICS_TIMEFRAMES,
  APP_LOCALES,
  EMOTION_LABEL_MODES,
  HISTORY_EVENTS,
} from '@/constants';
import { appSettingsStore } from '@/app-stores';
import { AppLocaleProvider } from '@/localization/app-locale-provider';
import { checkInHistoryStore } from '@/app-stores';
import { historyTimeframeStore } from '@/app-stores';
import { HistoryScreen } from '../ui/history-screen';

const visualTest = Platform.OS === 'android' ? test : test.skip;

afterEach(() => {
  historyTimeframeStore.trigger[HISTORY_EVENTS.TIMEFRAME_SELECTED]({
    timeframe: ANALYTICS_TIMEFRAMES.ALL_TIME,
  });
});

describe('history screen visual regression', () => {
  visualTest('keeps the aligned header and timeframe control stable', async () => {
    appSettingsStore.trigger.hydrated({
      settings: {
        locale: APP_LOCALES.GERMAN,
        emotionLabelMode: EMOTION_LABEL_MODES.EMOJI,
        onboardingCompleted: true,
      },
    });
    checkInHistoryStore.trigger.hydrated({ entries: [] });

    await render(
      <GestureHandlerRootView style={styles.root}>
        <AppLocaleProvider>
          <HistoryScreen now={new Date(2026, 6, 21, 12)} />
        </AppLocaleProvider>
      </GestureHandlerRootView>,
    );

    const screenshot = await screen.screenshot(await screen.findByTestId('history-screen'));
    if (!screenshot) throw new Error('The History screen screenshot is required.');
    await expect(screenshot).toMatchImageSnapshot({
      name: 'history-aligned-header-with-timeframe',
      comparisonMethod: 'ssim',
      ssimThreshold: 0.98,
    });
  });
});

const styles = StyleSheet.create({
  root: { flex: 1 },
});
