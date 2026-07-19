import { DevelopmentScreen } from '@/development/development-screen';
import { OnboardingScreen } from '@/features/onboarding/ui/onboarding-screen';

export default function OnboardingPulseRoute() {
  return (
    <DevelopmentScreen>
      <OnboardingScreen />
    </DevelopmentScreen>
  );
}
