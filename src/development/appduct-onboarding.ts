import * as Effect from 'effect/Effect';
import * as Schedule from 'effect/Schedule';
import * as Schema from 'effect/Schema';
import { waitFor } from 'xstate';
import assert from '@/assert';
import { NAVIGATION_STATES, ONBOARDING_EVENTS } from '@/constants';
import { loadAppSettings } from '@/features/settings/infrastructure/app-settings.repository';
import type { AppNavigationActor } from '@/navigation/app-navigation.provider';

export const OnboardingToolResultSchema = Schema.Struct({ completed: Schema.Boolean });

export async function readOnboardingState() {
  const settings = await Effect.runPromise(loadAppSettings);
  return { completed: settings.onboardingCompleted };
}

export async function skipOnboarding({ actor, signal }: {
  actor: AppNavigationActor;
  signal: AbortSignal;
}) {
  assert(actor.getSnapshot().status === 'active', 'Onboarding setup requires an active navigation actor.');
  await waitFor(actor, (snapshot) => (
    snapshot.matches(NAVIGATION_STATES.ONBOARDING)
    || snapshot.matches(NAVIGATION_STATES.TABS)
  ), { timeout: 5_000, signal });
  if (actor.getSnapshot().matches(NAVIGATION_STATES.ONBOARDING)) {
    actor.send({ type: ONBOARDING_EVENTS.SKIPPED });
  }
  await waitFor(actor, (snapshot) => snapshot.matches(NAVIGATION_STATES.TABS), {
    timeout: 5_000, signal,
  });
  assert(actor.getSnapshot().context.onboardingSelection === null, 'Skipping onboarding must clear the practice selection.');
  const settings = await Effect.runPromise(loadAppSettings.pipe(
    Effect.repeat({ until: (current) => current.onboardingCompleted, schedule: Schedule.spaced('50 millis') }),
    Effect.andThen(loadAppSettings),
    Effect.timeout('5 seconds'),
  ), { signal });
  return { completed: settings.onboardingCompleted };
}
