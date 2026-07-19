import { Stack } from 'expo-router';

import { DevelopmentScreen } from '@/development/development-screen';
import { OnboardingScreen } from '@/features/onboarding/ui/onboarding-screen';

export default function OnboardingPulseRoute() {
  return (
    <>
      <Stack.Screen options={{ gestureEnabled: false }} />
      <DevelopmentScreen>
        <OnboardingScreen />
      </DevelopmentScreen>
    </>
  );
}
