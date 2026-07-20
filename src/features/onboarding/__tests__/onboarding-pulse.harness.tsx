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
import { screen, userEvent } from '@react-native-harness/ui';
import { createActor, type Actor } from 'xstate';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import {
  APP_LOCALES,
  EMOTION_LABEL_MODES,
  NAVIGATION_EVENTS,
  NAVIGATION_STATES,
  ONBOARDING_EVENTS,
} from '@/constants';
import { checkInHistoryStore } from '@/features/check-in/application/check-in-history.store';
import { appSettingsStore } from '@/features/settings/application/app-settings.store';
import { AppLocaleProvider } from '@/localization/app-locale-provider';
import { appNavigationMachine } from '@/navigation/app-navigation.machine';

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
    mock('@/navigation/app-navigation.provider', () => ({
      useAppNavigationActor: currentActor,
    }));
    const onboardingModule: typeof import('../ui/onboarding-screen') = require(
      '../ui/onboarding-screen',
    );
    const { OnboardingScreen } = onboardingModule;
    appSettingsStore.trigger.hydrated({
      settings: {
        locale: APP_LOCALES.ENGLISH,
        emotionLabelMode: EMOTION_LABEL_MODES.EMOJI,
        onboardingCompleted: true,
      },
    });
    actor = createActor(appNavigationMachine).start();
    currentActor().send({ type: NAVIGATION_EVENTS.SETTINGS_OPENED });
    currentActor().send({ type: ONBOARDING_EVENTS.OPENED });
    await waitUntil(
      () => checkInHistoryStore.getSnapshot().context.hydrated,
      { timeout: 5_000 },
    );
    const initialEntries = checkInHistoryStore.getSnapshot().context.entries;

    await render(
      <GestureHandlerRootView>
        <AppLocaleProvider>
          <OnboardingScreen />
        </AppLocaleProvider>
      </GestureHandlerRootView>,
    );
    await userEvent.press(await screen.findByTestId('onboarding-primary-action'));
    await screen.findByTestId('emotion-star');
    await userEvent.press(await screen.findByTestId('onboarding-primary-action'));

    expect(currentActor().getSnapshot().context.onboardingSelection).not.toBeNull();
    await screen.findByAccessibilityLabel('Fear · Worry');
    await userEvent.press(await screen.findByTestId('onboarding-primary-action'));
    await screen.findByTestId('onboarding-example-step');
    await userEvent.press(await screen.findByTestId('onboarding-skip'));

    expect(currentActor().getSnapshot().matches({
      [NAVIGATION_STATES.TABS]: NAVIGATION_STATES.SETTINGS,
    })).toBe(true);
    expect(currentActor().getSnapshot().context.saved).toBeNull();
    expect(checkInHistoryStore.getSnapshot().context.entries).toEqual(initialEntries);
  });
});
