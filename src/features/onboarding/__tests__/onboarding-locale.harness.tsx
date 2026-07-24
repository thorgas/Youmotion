import {
  afterEach,
  describe,
  expect,
  fn,
  mock,
  render,
  resetModules,
  test,
} from 'react-native-harness';
import { screen } from '@react-native-harness/ui';

import { APP_LOCALES } from '@/constants';

const navigationSend = fn();

function loadOnboardingForLanguage(languageCode: string) {
  mock('expo-localization', () => ({
    getLocales: () => [{ languageCode }],
  }));
  mock('@/navigation/app-navigation.provider', () => ({
    useAppNavigationActor: () => ({ send: navigationSend }),
  }));
  const settingsModule: typeof import(
    '@/features/settings/application/app-settings.store'
  ) = require('@/features/settings/application/app-settings.store');
  const localizationModule: typeof import(
    '@/localization/app-locale-provider'
  ) = require('@/localization/app-locale-provider');
  const onboardingModule: typeof import(
    '../ui/onboarding-welcome-step'
  ) = require('../ui/onboarding-welcome-step');
  return {
    ...settingsModule,
    ...localizationModule,
    ...onboardingModule,
  };
}

afterEach(() => {
  resetModules();
});

describe('first-launch onboarding locale on the device runtime', () => {
  test('renders German for a German device before settings hydrate', async () => {
    const {
      AppLocaleProvider,
      appSettingsStore,
      OnboardingWelcomeStep,
    } = loadOnboardingForLanguage('de');

    await render(
      <AppLocaleProvider>
        <OnboardingWelcomeStep />
      </AppLocaleProvider>,
    );

    expect(appSettingsStore.getSnapshot().context).toMatchObject({
      locale: APP_LOCALES.GERMAN,
      hydrated: false,
    });
    await screen.findByAccessibilityLabel('Gib dem Raum, was gerade da ist.');
  });

  test('renders English for an English device before settings hydrate', async () => {
    const {
      AppLocaleProvider,
      appSettingsStore,
      OnboardingWelcomeStep,
    } = loadOnboardingForLanguage('en');

    await render(
      <AppLocaleProvider>
        <OnboardingWelcomeStep />
      </AppLocaleProvider>,
    );

    expect(appSettingsStore.getSnapshot().context).toMatchObject({
      locale: APP_LOCALES.ENGLISH,
      hydrated: false,
    });
    await screen.findByAccessibilityLabel('Make space for what is here.');
  });

  test('keeps German onboarding when settings hydration fails', async () => {
    const {
      AppLocaleProvider,
      appSettingsStore,
      OnboardingWelcomeStep,
    } = loadOnboardingForLanguage('de');

    appSettingsStore.trigger.hydrationFailed({
      message: 'Settings storage is unavailable.',
    });
    await render(
      <AppLocaleProvider>
        <OnboardingWelcomeStep />
      </AppLocaleProvider>,
    );

    expect(appSettingsStore.getSnapshot().context).toMatchObject({
      locale: APP_LOCALES.GERMAN,
      hydrated: true,
      error: 'Settings storage is unavailable.',
    });
    await screen.findByAccessibilityLabel('Gib dem Raum, was gerade da ist.');
  });
});
