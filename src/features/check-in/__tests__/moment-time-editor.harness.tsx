import { screen, userEvent } from '@react-native-harness/ui';
import * as Effect from 'effect/Effect';
import {
  afterEach,
  describe,
  expect,
  mock,
  render,
  resetModules,
  test,
  waitUntil,
} from 'react-native-harness';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createActor, type Actor } from 'xstate';

import {
  CHECK_IN_EVENTS,
  EMOTION_IDS,
  NAVIGATION_STATES,
} from '@/constants';
import { AppLocaleProvider } from '@/localization/app-locale-provider';
import type { EmotionSelection } from '../domain/check-in';

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
  resetModules();
});

describe('moment time editor on the device runtime', () => {
  test('reveals the native modal from the full occurrence time control', async () => {
    mock('@/features/data-safety/infrastructure/data-archive.repository', () => ({
      deleteAllJournalData: () => Effect.succeed(undefined),
      exportDataArchive: () => Effect.succeed(undefined),
      pickDataArchive: () => Effect.succeed(null),
      restoreDataArchive: () => Effect.succeed(undefined),
    }));
    mock('@/navigation/app-navigation.provider', () => ({
      useAppNavigationActor: currentActor,
    }));
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
  });
});
