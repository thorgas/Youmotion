import { screen, userEvent } from '@react-native-harness/ui';
import * as Effect from 'effect/Effect';
import {
  afterEach,
  describe,
  expect,
  mock,
  render,
  requireActual,
  resetModules,
  test,
  waitUntil,
} from 'react-native-harness';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet, View } from 'react-native';
import { createActor, type Actor } from 'xstate';

import {
  APP_LOCALES,
  CHECK_IN_EVENTS,
  EMOTION_IDS,
  NAVIGATION_STATES,
} from '@/constants';
import { appSettingsStore } from '@/app-stores';
import { AppLocaleProvider } from '@/localization/app-locale-provider';
import { CheckInTimestamp, type EmotionSelection } from '../domain/check-in';
import { palette } from '@/theme';

type NavigationMachine = typeof import(
  '@/navigation/app-navigation.machine'
)['appNavigationMachine'];

let actor: Actor<NavigationMachine> | undefined;

function currentActor() {
  if (!actor) throw new Error('The navigation actor must be started before use.');
  return actor;
}

const selection = {
  emotionId: EMOTION_IDS.JOY,
  intensity: 0.5,
  level: 2,
  color: '#E7AD32',
} satisfies EmotionSelection;

afterEach(() => {
  actor?.stop();
  actor = undefined;
  appSettingsStore.trigger.languageChanged({ locale: APP_LOCALES.ENGLISH });
  resetModules();
});

describe('moment time editor on the device runtime', () => {
  test('discards or applies the native modal draft through explicit actions', async () => {
    mock('@/features/data-safety/infrastructure/data-archive.repository', () => ({
      deleteAllJournalData: () => Effect.succeed(undefined),
      exportDataArchive: () => Effect.succeed(undefined),
      pickDataArchive: () => Effect.succeed(null),
      restoreDataArchive: () => Effect.succeed(undefined),
    }));
    mock('@/navigation/app-navigation.provider', () => ({
      useAppNavigationActor: currentActor,
    }));
    mock('react-native', () => {
      const actual: typeof import('react-native') = requireActual('react-native');
      const react: typeof import('react') = require('react');
      const mocked = Object.create(
        Object.getPrototypeOf(actual),
        Object.getOwnPropertyDescriptors(actual),
      );
      Object.defineProperty(mocked, 'Modal', {
        configurable: true,
        value: ({ children, visible }: import('react-native').ModalProps) => (
          visible ? react.createElement(react.Fragment, null, children) : null
        ),
      });
      return mocked;
    });
    const navigationModule: typeof import('@/navigation/app-navigation.machine') = require(
      '@/navigation/app-navigation.machine',
    );
    const reflectionModule: typeof import('../ui/reflection-screen') = require(
      '../ui/reflection-screen',
    );
    actor = createActor(navigationModule.appNavigationMachine).start();
    await waitUntil(
      () => currentActor().getSnapshot().matches(NAVIGATION_STATES.TABS),
      { timeout: 5_000 },
    );
    currentActor().send({ type: CHECK_IN_EVENTS.TOUCH_STARTED });
    currentActor().send({ type: CHECK_IN_EVENTS.SELECTION_CHANGED, selection });
    currentActor().send({ type: CHECK_IN_EVENTS.SELECTION_RELEASED });
    const original = currentActor().getSnapshot().context.occurredAtDraft;
    const { MomentTimeControl } = reflectionModule;

    await render(
      <AppLocaleProvider>
        <SafeAreaProvider>
          <GestureHandlerRootView>
            <MomentTimeControl disabled={false} />
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </AppLocaleProvider>,
    );

    const control = await screen.findByTestId('moment-time-control');
    expect(control).toBeTruthy();
    await userEvent.press(control);

    await waitUntil(() => currentActor().getSnapshot().context.momentTimeEditorOpen);
    expect(currentActor().getSnapshot().context.momentTimeEditorOpen).toBe(true);
    expect(await screen.findByTestId('moment-time-modal')).toBeTruthy();
    expect(await screen.findByTestId('confirm-moment-time')).toBeTruthy();

    const changed = CheckInTimestamp.make('2020-04-12T08:30:00.000Z');
    currentActor().send({ type: CHECK_IN_EVENTS.MOMENT_TIME_CHANGED, occurredAt: changed });
    await userEvent.press(await screen.findByTestId('cancel-moment-time'));
    await waitUntil(() => !currentActor().getSnapshot().context.momentTimeEditorOpen);
    expect(currentActor().getSnapshot().context.occurredAtDraft).toBe(original);

    await userEvent.press(await screen.findByTestId('moment-time-control'));
    await waitUntil(() => currentActor().getSnapshot().context.momentTimeEditorOpen);
    currentActor().send({ type: CHECK_IN_EVENTS.MOMENT_TIME_CHANGED, occurredAt: changed });
    await userEvent.press(await screen.findByTestId('confirm-moment-time'));
    await waitUntil(() => !currentActor().getSnapshot().context.momentTimeEditorOpen);
    expect(currentActor().getSnapshot().context.occurredAtDraft).toBe(changed);
  });

  test('shows optionality instead of a timer-like reflection estimate', async () => {
    const reflectionModule: typeof import('../ui/reflection-screen') = require(
      '../ui/reflection-screen',
    );
    appSettingsStore.trigger.languageChanged({ locale: APP_LOCALES.GERMAN });
    const { ReflectionNoteHeader } = reflectionModule;

    await render(
      <AppLocaleProvider>
        <View style={styles.noteHeaderPreview} testID="reflection-note-header-preview">
          <ReflectionNoteHeader />
        </View>
      </AppLocaleProvider>,
    );

    expect(await screen.findByTestId('reflection-note-optionality')).toBeTruthy();
    const editorScreenshot = await screen.screenshot(
      await screen.findByTestId('reflection-note-header-preview'),
    );
    if (!editorScreenshot) throw new Error('The reflection editor screenshot is required.');
    await expect(editorScreenshot).toMatchImageSnapshot({
      name: 'reflection-note-optional-label',
      comparisonMethod: 'ssim',
      ssimThreshold: 0.98,
    });
  });
});

const styles = StyleSheet.create({
  noteHeaderPreview: {
    backgroundColor: palette.paperRaised,
    paddingHorizontal: 24,
    paddingVertical: 20,
    width: '100%',
  },
});
