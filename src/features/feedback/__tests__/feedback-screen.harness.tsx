import { screen, userEvent } from '@react-native-harness/ui';
import {
  afterEach,
  describe,
  mock,
  render,
  resetModules,
  test,
} from 'react-native-harness';
import { StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { APP_LOCALES, EMOTION_LABEL_MODES } from '@/constants';
import { palette, type } from '@/theme';
import { appSettingsStore } from '@/app-stores';
import { AppLocaleProvider } from '@/localization/app-locale-provider';

afterEach(() => {
  resetModules();
});

describe('feedback screen interaction', () => {
  test('opens the email choice from the settings feedback action', async () => {
    mock('../infrastructure/feedback-mail', () => ({
      composeFeedbackEmail: () => Promise.resolve(),
      FeedbackMailError: class FeedbackMailError extends Error {},
    }));
    mock('../infrastructure/feedback-screenshot', () => ({
      captureFeedbackScreenshot: () => Promise.resolve('file:///tmp/feedback.png'),
    }));
    const feedbackModule: typeof import('../ui/feedback-screen') = require(
      '../ui/feedback-screen',
    );
    const { FeedbackOverlay, FeedbackProvider, FeedbackSettingsAction } = feedbackModule;
    appSettingsStore.trigger.hydrated({
      settings: {
        locale: APP_LOCALES.ENGLISH,
        emotionLabelMode: EMOTION_LABEL_MODES.BOTH,
        onboardingCompleted: true,
      },
    });

    await render(
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaProvider>
          <AppLocaleProvider>
            <FeedbackProvider>
            <View style={styles.page}>
              <Text style={styles.eyebrow}>TODAY</Text>
              <Text style={styles.title}>How are you feeling right now?</Text>
              <View style={styles.card}>
                <Text style={styles.cardSymbol}>✦</Text>
                <Text style={styles.cardCopy}>Your private reflection stays on this device.</Text>
              </View>
              <FeedbackSettingsAction />
              <FeedbackOverlay />
            </View>
            </FeedbackProvider>
          </AppLocaleProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>,
    );

    await userEvent.press(await screen.findByTestId('feedback-button'));
    await screen.findByTestId('feedback-question');
  });
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  page: {
    flex: 1,
    backgroundColor: palette.paper,
    paddingHorizontal: 22,
    paddingTop: 72,
  },
  eyebrow: {
    color: palette.inkMuted,
    fontFamily: type.semibold,
    fontSize: 11,
    letterSpacing: 1.4,
  },
  title: {
    maxWidth: 330,
    color: palette.ink,
    fontFamily: type.semibold,
    fontSize: 34,
    lineHeight: 40,
    marginTop: 8,
  },
  card: {
    alignItems: 'center',
    backgroundColor: palette.paperRaised,
    borderColor: palette.hairline,
    borderCurve: 'continuous',
    borderRadius: 30,
    borderWidth: 1,
    marginTop: 28,
    paddingHorizontal: 24,
    paddingVertical: 44,
  },
  cardSymbol: { color: palette.moss, fontSize: 64 },
  cardCopy: {
    maxWidth: 240,
    color: palette.inkMuted,
    fontFamily: type.regular,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 16,
    textAlign: 'center',
  },
});
