import { Fraunces_400Regular, Fraunces_500Medium, Fraunces_600SemiBold } from '@expo-google-fonts/fraunces';
import { useSelector } from '@xstate/react';
import { useFonts } from 'expo-font';
import { ExperimentalStack, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { PressFeedbackProvider } from '@/components/ui/press-feedback-provider';
import { NAVIGATION_EVENTS, SPLASH_BACKGROUND_COLOR } from '@/constants';
import { DevelopmentRoot } from '@/development/development-root';
import { AnimatedSplashScreen } from '@/features/startup/ui/animated-splash-screen';
import { AppLocaleProvider } from '@/localization/app-locale-provider';
import {
  AppNavigationProvider,
  type AppNavigationActor,
  useAppNavigationActor,
} from '@/navigation/app-navigation.provider';
import {
  nativeRouteTransitionEnded,
  preventUnavailableNativeBack,
} from '@/navigation/app-router.adapter';

const selectCanGoBack = (
  snapshot: ReturnType<AppNavigationActor['getSnapshot']>,
) => snapshot.can({ type: NAVIGATION_EVENTS.BACK_REQUESTED });

function AppStack() {
  const actor = useAppNavigationActor();
  const canGoBack = useSelector(actor, selectCanGoBack);
  const screenListeners = ({ route }: { route: { name?: string } }) => {
    const beforeRemove = (event: { preventDefault: () => void }) => {
      preventUnavailableNativeBack({ actor, event, routeName: route.name });
    };
    const transitionEnd = (event: { data: { closing: boolean } }) => {
      nativeRouteTransitionEnded({ actor, event, routeName: route.name });
    };
    return { beforeRemove, transitionEnd };
  };

  if (process.env.EXPO_OS === 'android') {
    return (
      <ExperimentalStack
        screenListeners={screenListeners}
        screenOptions={{ headerShown: false }}
      />
    );
  }

  return (
    <Stack
      screenListeners={screenListeners}
      screenOptions={{
        contentStyle: { backgroundColor: SPLASH_BACKGROUND_COLOR },
        gestureEnabled: canGoBack,
        headerShown: false,
      }}
    />
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Fraunces_400Regular,
    Fraunces_500Medium,
    Fraunces_600SemiBold,
  });

  if (!fontsLoaded && !fontError) return null;

  return (
    <AnimatedSplashScreen>
      <KeyboardProvider preload={false}>
        <AppNavigationProvider>
          <AppLocaleProvider>
            <DevelopmentRoot>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <PressFeedbackProvider>
                  <StatusBar style="dark" />
                  <AppStack />
                </PressFeedbackProvider>
              </GestureHandlerRootView>
            </DevelopmentRoot>
          </AppLocaleProvider>
        </AppNavigationProvider>
      </KeyboardProvider>
    </AnimatedSplashScreen>
  );
}
