import { useSelector } from '@xstate/react';

import { ONBOARDING_STATES } from '@/constants';
import { useAppNavigationActor } from '@/navigation/app-navigation.provider';
import { OnboardingExampleStep } from './onboarding-example-step';
import { OnboardingPulseStep } from './onboarding-pulse-step';
import { OnboardingWelcomeStep } from './onboarding-welcome-step';

const _selectOnboardingStep = (
  snapshot: ReturnType<ReturnType<typeof useAppNavigationActor>['getSnapshot']>,
) => {
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

  if (step === ONBOARDING_STATES.WELCOME) return <OnboardingWelcomeStep />;
  if (step === ONBOARDING_STATES.PULSE) return <OnboardingPulseStep />;
  return <OnboardingExampleStep />;
}
