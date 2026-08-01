import {
  InstrumentSans_400Regular,
  InstrumentSans_500Medium,
  InstrumentSans_600SemiBold,
} from '@expo-google-fonts/instrument-sans';
import { useSelector } from '@xstate/react';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { PressFeedbackProvider } from '@/components/ui/press-feedback-provider';
import { NAVIGATION_EVENTS, SPLASH_BACKGROUND_COLOR } from '@/constants';
import { DevelopmentRoot } from '@/development/development-root';
import { AnimatedSplashScreen } from '@/features/startup/ui/animated-splash-screen';
import { FeedbackOverlay } from '@/features/feedback/ui/feedback-screen';
import { AppLocaleProvider } from '@/localization/app-locale-provider';
import {
  AppNavigationProvider,
  type AppNavigationActor,
  useAppNavigationActor,
} from '@/navigation/app-navigation.provider';
import {
  handleNativeRouteRemoval,
  nativeRouteTransitionEnded,
} from '@/navigation/app-router.adapter';

const selectCanGoBack = (
  snapshot: ReturnType<AppNavigationActor['getSnapshot']>,
) => snapshot.can({ type: NAVIGATION_EVENTS.BACK_REQUESTED });

function AppStack() {
  const actor = useAppNavigationActor();
  const canGoBack = useSelector(actor, selectCanGoBack);
  const screenListeners = ({ route }: { route: { name?: string } }) => {
    const beforeRemove = (event: { preventDefault: () => void }) => {
      handleNativeRouteRemoval({ actor, event, routeName: route.name });
    };
    const transitionEnd = (event: { data: { closing: boolean } }) => {
      nativeRouteTransitionEnded({ actor, event, routeName: route.name });
    };
    return { beforeRemove, transitionEnd };
  };

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
    InstrumentSans_400Regular,
    InstrumentSans_500Medium,
    InstrumentSans_600SemiBold,
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
                  <FeedbackOverlay />
                </PressFeedbackProvider>
              </GestureHandlerRootView>
            </DevelopmentRoot>
          </AppLocaleProvider>
        </AppNavigationProvider>
      </KeyboardProvider>
    </AnimatedSplashScreen>
  );
}
