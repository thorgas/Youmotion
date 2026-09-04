import {
  afterEach,
  describe,
  expect,
  fn,
  mock,
  render,
  requireActual,
  resetModules,
  test,
} from 'react-native-harness';
import { screen } from '@react-native-harness/ui';

import { APP_LOCALES } from '@/constants';

const navigationSend = fn();

function loadOnboardingForLanguage(languageCode: string) {
  mock('@/app-stores', () => {
    const actualStores: typeof import(
      '@/app-stores'
    ) = requireActual('@/app-stores');
    const settings: typeof import(
      '@/features/settings/application/app-settings.store'
    ) = requireActual('@/features/settings/application/app-settings.store');
    return {
      ...actualStores,
      appSettingsStore: settings.createAppSettingsStore(
        settings.initialAppSettingsContext([languageCode]),
      ),
    };
  });
  mock('@/navigation/app-navigation.provider', () => ({
    useAppNavigationActor: () => ({ send: navigationSend }),
  }));
  const settingsModule: typeof import(
    '@/app-stores'
  ) = require('@/app-stores');
  const localizationModule: typeof import(
    '@/localization/app-locale-provider'
  ) = require('@/localization/app-locale-provider');
  const localizationConfiguration: typeof import(
    '@/localization/app-locale.configuration'
  ) = require('@/localization/app-locale.configuration');
  const onboardingModule: typeof import(
    '../ui/onboarding-welcome-step'
  ) = require('../ui/onboarding-welcome-step');
  return {
    ...settingsModule,
    ...localizationConfiguration,
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
      configureAppLocale,
      OnboardingWelcomeStep,
    } = loadOnboardingForLanguage('de');
    configureAppLocale(appSettingsStore);

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
      configureAppLocale,
      OnboardingWelcomeStep,
    } = loadOnboardingForLanguage('en');
    configureAppLocale(appSettingsStore);

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
      configureAppLocale,
      OnboardingWelcomeStep,
    } = loadOnboardingForLanguage('de');

    appSettingsStore.trigger.hydrationFailed({
      message: 'Settings storage is unavailable.',
    });
    configureAppLocale(appSettingsStore);
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
