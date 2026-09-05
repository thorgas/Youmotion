import {
  afterEach,
  describe,
  expect,
  render,
  resetModules,
  test,
  waitUntil,
} from 'react-native-harness';
import { screen } from '@react-native-harness/ui';
import { createActor, type Actor } from 'xstate';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import {
  APP_LOCALES,
  EMOTION_IDS,
  EMOTION_LABEL_MODES,
  NAVIGATION_EVENTS,
  NAVIGATION_STATES,
  ONBOARDING_EVENTS,
  ONBOARDING_STATES,
} from '@/constants';
import { checkInHistoryStore } from '@/app-stores';
import { appSettingsStore } from '@/app-stores';
import { configureAppLocale } from '@/localization/app-locale.configuration';
import { AppLocaleProvider } from '@/localization/app-locale-provider';
import { appNavigationMachine } from '@/navigation/app-navigation.composition';
import { AppNavigationActorProvider } from '@/navigation/app-navigation.provider';
import { pressLaidOutUntil } from '@/testing/harness-ui';
import { OnboardingScreen } from '../ui/onboarding-screen';

let actor: Actor<typeof appNavigationMachine> | undefined;

function currentActor() {
  if (!actor) throw new Error('The onboarding actor must be started before use.');
  return actor;
}

afterEach(() => {
  actor?.stop();
  actor = undefined;
  resetModules();
});

describe('onboarding Pulse on the device runtime', () => {
  test('offers a native non-gesture example without creating a check-in', async () => {
    appSettingsStore.trigger.hydrated({
      settings: {
        locale: APP_LOCALES.ENGLISH,
        emotionLabelMode: EMOTION_LABEL_MODES.EMOJI,
        onboardingCompleted: true,
      },
    });
    configureAppLocale(appSettingsStore);
    actor = createActor(appNavigationMachine).start();
    await waitUntil(
      () => currentActor().getSnapshot().matches(NAVIGATION_STATES.TABS),
      { timeout: 5_000 },
    );
    currentActor().send({ type: NAVIGATION_EVENTS.SETTINGS_OPENED });
    currentActor().send({ type: ONBOARDING_EVENTS.OPENED });
    await waitUntil(
      () => currentActor().getSnapshot().matches({
        [NAVIGATION_STATES.ONBOARDING]: ONBOARDING_STATES.WELCOME,
      }),
      { timeout: 5_000 },
    );
    await waitUntil(
      () => checkInHistoryStore.getSnapshot().context.hydrated,
      { timeout: 5_000 },
    );
    appSettingsStore.trigger.hydrated({
      settings: {
        locale: APP_LOCALES.ENGLISH,
        emotionLabelMode: EMOTION_LABEL_MODES.EMOJI,
        onboardingCompleted: true,
      },
    });
    configureAppLocale(appSettingsStore);
    const initialEntries = checkInHistoryStore.getSnapshot().context.entries;

    await render(
      <GestureHandlerRootView>
        <AppNavigationActorProvider actor={currentActor()}>
          <AppLocaleProvider>
            <OnboardingScreen />
          </AppLocaleProvider>
        </AppNavigationActorProvider>
      </GestureHandlerRootView>,
    );
    await pressLaidOutUntil({
      isComplete: () => currentActor().getSnapshot().matches({
        [NAVIGATION_STATES.ONBOARDING]: ONBOARDING_STATES.PULSE,
      }),
      testID: 'onboarding-primary-action',
    });
    await screen.findByTestId('emotion-star');
    currentActor().send({
      type: ONBOARDING_EVENTS.SELECTION_CHANGED,
      selection: {
        emotionId: EMOTION_IDS.JOY,
        intensity: 0.42,
        level: 2,
        color: '#E7AD32',
      },
    });
    await screen.findByAccessibilityLabel('Feeling Pulse');
    await pressLaidOutUntil({
      isComplete: () => currentActor().getSnapshot().matches({
        [NAVIGATION_STATES.ONBOARDING]: ONBOARDING_STATES.EXAMPLE,
      }),
      testID: 'onboarding-primary-action',
    });

    await screen.findByTestId('onboarding-example-step');
    await screen.findByAccessibilityLabel('Worry · Fear');
    await screen.findByAccessibilityLabel('Core belief · what limits you');
    await screen.findByAccessibilityLabel('Guiding belief · what supports you');
    await pressLaidOutUntil({
      isComplete: () => currentActor().getSnapshot().matches({
        [NAVIGATION_STATES.TABS]: NAVIGATION_STATES.SETTINGS,
      }),
      testID: 'onboarding-skip',
    });

    expect(currentActor().getSnapshot().matches({
      [NAVIGATION_STATES.TABS]: NAVIGATION_STATES.SETTINGS,
    })).toBe(true);
    expect(currentActor().getSnapshot().context.saved).toBeNull();
    expect(checkInHistoryStore.getSnapshot().context.entries).toEqual(initialEntries);
  });
});
