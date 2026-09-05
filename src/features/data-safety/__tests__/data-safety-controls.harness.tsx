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
  waitUntil,
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
import { appSettingsStore } from '@/app-stores';

type NavigationMachine = typeof import('@/navigation/app-navigation.composition')['appNavigationMachine'];

let actor: Actor<NavigationMachine> | undefined;

function currentActor() {
  if (!actor) throw new Error('The navigation actor must be started before use.');
  return actor;
}

const _dismissMessage = () => undefined;

afterEach(() => {
  actor?.stop();
  actor = undefined;
  resetModules();
});

describe('data safety controls on the device runtime', () => {
  test('reaches the actor-owned delete confirmation on the device runtime', () => {
    mock('@/features/data-safety/infrastructure/data-archive.repository', () => ({
      deleteAllJournalData: () => Effect.succeed(undefined),
      exportDataArchive: () => Effect.succeed(undefined),
      pickDataArchive: () => Effect.succeed(null),
      restoreDataArchive: () => Effect.succeed(undefined),
    }));
    mock('@/navigation/app-navigation.provider', () => ({
      useAppNavigationActor: currentActor,
    }));
    const navigationModule: typeof import('@/navigation/app-navigation.composition') = require(
      '@/navigation/app-navigation.composition',
    );
    const { appNavigationMachine } = navigationModule;
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

    expect(currentActor().getSnapshot().matches({
      [NAVIGATION_STATES.TABS]: {
        [NAVIGATION_STATES.SETTINGS]: DATA_SAFETY_STATES.DELETE_CONFIRMATION,
      },
    })).toBe(true);
  });

  test('shows the localized export success notice on the device runtime', async () => {
    mock('@/features/data-safety/infrastructure/data-archive.repository', () => ({
      deleteAllJournalData: () => Effect.succeed(undefined),
      exportDataArchive: () => Effect.succeed(undefined),
      pickDataArchive: () => Effect.succeed(null),
      restoreDataArchive: () => Effect.succeed(undefined),
    }));
    mock('@/navigation/app-navigation.provider', () => ({
      useAppNavigationActor: currentActor,
    }));
    const navigationModule: typeof import('@/navigation/app-navigation.composition') = require(
      '@/navigation/app-navigation.composition',
    );
    const { appNavigationMachine } = navigationModule;
    const messageModule: typeof import('../ui/data-safety-message') = require(
      '../ui/data-safety-message',
    );
    const { DataSafetyMessage } = messageModule;
    const settingsModule: typeof import('@/app-stores') = require('@/app-stores');
    const localeModule: typeof import('@/localization/app-locale-provider') = require(
      '@/localization/app-locale-provider',
    );
    const { AppLocaleProvider } = localeModule;
    const localeConfiguration: typeof import('@/localization/app-locale.configuration') = require(
      '@/localization/app-locale.configuration',
    );
    localeConfiguration.configureAppLocale(settingsModule.appSettingsStore);
    settingsModule.appSettingsStore.trigger.hydrated({
      settings: {
        locale: APP_LOCALES.GERMAN,
        emotionLabelMode: EMOTION_LABEL_MODES.EMOJI,
        onboardingCompleted: true,
      },
    });
    actor = createActor(appNavigationMachine).start();
    currentActor().send({ type: NAVIGATION_EVENTS.SETTINGS_OPENED });
    currentActor().send({ type: DATA_SAFETY_EVENTS.EXPORT_REQUESTED });
    await waitUntil(() => currentActor().getSnapshot().context.dataSafetyNotice !== null);
    const notice = currentActor().getSnapshot().context.dataSafetyNotice;
    settingsModule.appSettingsStore.trigger.hydrated({
      settings: {
        locale: APP_LOCALES.GERMAN,
        emotionLabelMode: EMOTION_LABEL_MODES.EMOJI,
        onboardingCompleted: true,
      },
    });
    expect(settingsModule.appSettingsStore.getSnapshot().context.locale).toBe(APP_LOCALES.GERMAN);
    localeConfiguration.configureAppLocale(settingsModule.appSettingsStore);

    await render(
      <GestureHandlerRootView>
        <AppLocaleProvider>
          <DataSafetyMessage error={null} notice={notice} onDismiss={_dismissMessage} />
        </AppLocaleProvider>
      </GestureHandlerRootView>,
    );

    expect(await screen.findByTestId('data-safety-notice')).not.toBeNull();
    expect(await screen.findByAccessibilityLabel('Deine Sicherung ist bereit.')).not.toBeNull();
  });
});
