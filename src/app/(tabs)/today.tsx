import { Stack } from 'expo-router';

import { DevelopmentScreen } from '@/development/development-screen';
import { CheckInScreen } from '@/features/check-in/ui/check-in-screen';

export default function TodayRoute() {
  return (
    <>
      <Stack.Screen options={{ gestureEnabled: false }} />
      <DevelopmentScreen>
        <CheckInScreen />
      </DevelopmentScreen>
    </>
  );
}
