import { afterEach, describe, expect, resetModules, test } from 'react-native-harness';
import { createActor, type Actor } from 'xstate';
import * as Effect from 'effect/Effect';
import { appSettingsStore } from '@/app-stores';
import { APP_LOCALES, EMOTION_LABEL_MODES, NAVIGATION_STATES } from '@/constants';
import { persistAppSettings } from '@/features/settings/infrastructure/app-settings.repository';
import { appNavigationMachine } from '@/navigation/app-navigation.composition';
import { seedArchiveFixture } from '@/development/appduct-fixture';
import { readOnboardingState, skipOnboarding } from '@/development/appduct-onboarding';
import archiveFixture from '@/features/data-safety/__tests__/fixtures/legacy-archive.fixture.json';

let actor: Actor<typeof appNavigationMachine> | undefined;

afterEach(() => {
  actor?.stop();
  actor = undefined;
  resetModules();
});

describe('Appduct onboarding setup in the native runtime', () => {
  test('uses the synthetic archive and persists the actor shortcut across a fresh actor', async () => {
    expect(await seedArchiveFixture({ archive: archiveFixture })).toEqual({ moments: 133, beliefs: 15 });
    const settings = {
      locale: APP_LOCALES.ENGLISH,
      emotionLabelMode: EMOTION_LABEL_MODES.EMOJI,
      onboardingCompleted: false,
    };
    await Effect.runPromise(persistAppSettings(settings));
    appSettingsStore.trigger.hydrated({ settings });
    actor = createActor(appNavigationMachine).start();
    expect(await readOnboardingState()).toEqual({ completed: false });
    const signal = new AbortController().signal;
    expect(await skipOnboarding({ actor, signal })).toEqual({ completed: true });
    expect(await skipOnboarding({ actor, signal })).toEqual({ completed: true });
    expect(actor.getSnapshot().matches(NAVIGATION_STATES.TABS)).toBe(true);
    actor.stop();
    actor = createActor(appNavigationMachine).start();
    expect(await readOnboardingState()).toEqual({ completed: true });
    expect(actor.getSnapshot().matches(NAVIGATION_STATES.TABS)).toBe(true);
  });
});
