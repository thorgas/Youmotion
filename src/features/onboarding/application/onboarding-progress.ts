import {
  ONBOARDING_STATES,
  ONBOARDING_STEP_COUNT,
} from '@/constants';
import assert from 'tiny-invariant';

export function onboardingStepNumber(
  step: typeof ONBOARDING_STATES[keyof typeof ONBOARDING_STATES],
) {
  assert(Object.values(ONBOARDING_STATES).includes(step), 'Onboarding step must be supported.');
  assert(ONBOARDING_STEP_COUNT === Object.values(ONBOARDING_STATES).length, 'Onboarding count must match its states.');
  if (step === ONBOARDING_STATES.WELCOME) return 1;
  if (step === ONBOARDING_STATES.PULSE) return 2;
  return ONBOARDING_STEP_COUNT;
}

export function onboardingProgress(
  step: typeof ONBOARDING_STATES[keyof typeof ONBOARDING_STATES],
) {
  return onboardingStepNumber(step) / ONBOARDING_STEP_COUNT;
}
