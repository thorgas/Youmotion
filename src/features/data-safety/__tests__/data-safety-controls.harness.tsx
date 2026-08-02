import { screen } from '@react-native-harness/ui';
import * as Effect from 'effect/Effect';
import {
  afterEach,
  describe,
  expect,
  mock,
  render,
  resetModules,
  test,
} from 'react-native-harness';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { createActor, type Actor } from 'xstate';

import {
  APP_LOCALES,
  DATA_SAFETY_EVENTS,
  DATA_SAFETY_STATES,
  EMOTION_LABEL_MODES,
  NAVIGATION_EVENTS,
  NAVIGATION_STATES,
} from '@/constants';
import { appSettingsStore } from '@/features/settings/application/app-settings.store';
import { AppLocaleProvider } from '@/localization/app-locale-provider';

type NavigationMachine = typeof import('@/navigation/app-navigation.machine')['appNavigationMachine'];

let actor: Actor<NavigationMachine> | undefined;

function currentActor() {
  if (!actor) throw new Error('The navigation actor must be started before use.');
  return actor;
}

afterEach(() => {
  actor?.stop();
  actor = undefined;
  resetModules();
});

describe('data safety controls on the device runtime', () => {
  test('renders the actor-owned delete confirmation on the device runtime', async () => {
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
    const { appNavigationMachine } = navigationModule;
    const controlsModule: typeof import('../ui/data-safety-controls') = require(
      '../ui/data-safety-controls',
    );
    const { DataSafetyControls } = controlsModule;
    appSettingsStore.trigger.hydrated({
      settings: {
        locale: APP_LOCALES.ENGLISH,
        emotionLabelMode: EMOTION_LABEL_MODES.EMOJI,
        onboardingCompleted: true,
      },
    });
    actor = createActor(appNavigationMachine).start();
    currentActor().send({ type: NAVIGATION_EVENTS.SETTINGS_OPENED });
    currentActor().send({ type: DATA_SAFETY_EVENTS.DELETE_REQUESTED });

    await render(
      <GestureHandlerRootView>
        <AppLocaleProvider>
          <DataSafetyControls locale={APP_LOCALES.ENGLISH} />
        </AppLocaleProvider>
      </GestureHandlerRootView>,
    );

    expect(currentActor().getSnapshot().matches({
      [NAVIGATION_STATES.TABS]: {
        [NAVIGATION_STATES.SETTINGS]: DATA_SAFETY_STATES.DELETE_CONFIRMATION,
      },
    })).toBe(true);
    expect(await screen.findByTestId('delete-all-confirmation')).not.toBeNull();
    expect(await screen.findByTestId('export-data-archive')).not.toBeNull();
  });
});
