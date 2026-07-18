import { Fraunces_400Regular, Fraunces_500Medium, Fraunces_600SemiBold } from '@expo-google-fonts/fraunces';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { PressFeedbackProvider } from '@/components/ui/press-feedback-provider';
import { SPLASH_BACKGROUND_COLOR } from '@/constants';
import { DevelopmentRoot } from '@/development/development-root';
import { AnimatedSplashScreen } from '@/features/startup/ui/animated-splash-screen';
import { AppLocaleProvider } from '@/localization/app-locale-provider';
import { AppNavigationProvider } from '@/navigation/app-navigation.provider';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Fraunces_400Regular,
    Fraunces_500Medium,
    Fraunces_600SemiBold,
  });

  if (!fontsLoaded && !fontError) return null;

  return (
    <AnimatedSplashScreen>
      <KeyboardProvider>
        <AppNavigationProvider>
          <AppLocaleProvider>
            <DevelopmentRoot>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <PressFeedbackProvider>
                  <StatusBar style="dark" />
                  <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: SPLASH_BACKGROUND_COLOR } }} />
                </PressFeedbackProvider>
              </GestureHandlerRootView>
            </DevelopmentRoot>
          </AppLocaleProvider>
        </AppNavigationProvider>
      </KeyboardProvider>
    </AnimatedSplashScreen>
  );
}
