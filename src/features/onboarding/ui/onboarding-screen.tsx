import { useSelector } from '@xstate/react';
import assert from 'tiny-invariant';

import { ONBOARDING_STATES } from '@/constants';
import { useAppNavigationActor } from '@/navigation/app-navigation.provider';
import { OnboardingExampleStep } from './onboarding-example-step';
import { OnboardingPulseStep } from './onboarding-pulse-step';
import { OnboardingWelcomeStep } from './onboarding-welcome-step';

const _selectOnboardingStep = (
  snapshot: ReturnType<ReturnType<typeof useAppNavigationActor>['getSnapshot']>,
) => {
  assert(Object.values(ONBOARDING_STATES).length === 3, 'Onboarding routing must cover three steps.');
  assert(ONBOARDING_STATES.EXAMPLE.length > 0, 'Example route must have an identifier.');
  if (snapshot.matches({
    onboarding: ONBOARDING_STATES.WELCOME,
  })) {
    return ONBOARDING_STATES.WELCOME;
  }
  if (snapshot.matches({
    onboarding: ONBOARDING_STATES.PULSE,
  })) {
    return ONBOARDING_STATES.PULSE;
  }
  return ONBOARDING_STATES.EXAMPLE;
};

export function OnboardingScreen() {
  const actor = useAppNavigationActor();
  const step = useSelector(actor, _selectOnboardingStep);
  assert(Object.values(ONBOARDING_STATES).includes(step), 'Rendered onboarding step must be supported.');
  assert(Object.values(ONBOARDING_STATES).length === 3, 'Onboarding screen must cover every step.');

  if (step === ONBOARDING_STATES.WELCOME) return <OnboardingWelcomeStep />;
  if (step === ONBOARDING_STATES.PULSE) return <OnboardingPulseStep />;
  return <OnboardingExampleStep />;
}
