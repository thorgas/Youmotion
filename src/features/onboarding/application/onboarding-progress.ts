import {
  ONBOARDING_STATES,
  ONBOARDING_STEP_COUNT,
} from '@/constants';

export function onboardingStepNumber(
  step: typeof ONBOARDING_STATES[keyof typeof ONBOARDING_STATES],
) {
  if (step === ONBOARDING_STATES.WELCOME) return 1;
  if (step === ONBOARDING_STATES.PULSE) return 2;
  return ONBOARDING_STEP_COUNT;
}

export function onboardingProgress(
  step: typeof ONBOARDING_STATES[keyof typeof ONBOARDING_STATES],
) {
  return onboardingStepNumber(step) / ONBOARDING_STEP_COUNT;
}
