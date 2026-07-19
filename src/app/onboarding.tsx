import { DevelopmentScreen } from '@/development/development-screen';
import { OnboardingScreen } from '@/features/onboarding/ui/onboarding-screen';

export default function OnboardingRoute() {
  return (
    <DevelopmentScreen>
      <OnboardingScreen />
    </DevelopmentScreen>
  );
}
