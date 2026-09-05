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
import assert from '@/assert';

import { PressFeedbackProvider } from '@/components/ui/press-feedback-provider';
import { NAVIGATION_EVENTS, SPLASH_BACKGROUND_COLOR } from '@/constants';
import { DevelopmentRoot } from '@/development/development-root';
import { AnimatedSplashScreen } from '@/features/startup/ui/animated-splash-screen';
import { FeedbackOverlay, FeedbackProvider } from '@/features/feedback/ui/feedback-screen';
import { AppLocaleProvider } from '@/localization/app-locale-provider';
import {
  AppNavigationProvider,
  type AppNavigationActor,
  useAppNavigationActor,
} from '@/navigation/app-navigation.provider';
import { appNavigationMachine } from '@/navigation/app-navigation.composition';
import {
  handleNativeRouteRemoval,
  nativeRouteTransitionEnded,
} from '@/navigation/app-router.adapter';

const selectCanGoBack = (
  snapshot: ReturnType<AppNavigationActor['getSnapshot']>,
) => snapshot.can({ type: NAVIGATION_EVENTS.BACK_REQUESTED });

function AppStack() {
  const actor = useAppNavigationActor();
  assert(actor.getSnapshot().status !== 'stopped', 'App stack requires an active navigation actor.');
  assert(actor.getSnapshot().machine === appNavigationMachine, 'App stack requires the app navigation machine.');
  const canGoBack = useSelector(actor, selectCanGoBack);
  const screenListeners = ({ route }: { route: { name?: string } }) => {
    assert(actor.getSnapshot().status !== 'stopped', 'Native screen listeners require an active actor.');
    assert(route.name === undefined || route.name === route.name.trim(), 'Native route names cannot contain outer whitespace.');
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
  assert(fontsLoaded || fontError !== null, 'Root layout requires loaded fonts or a font error.');
  assert(fontError === null || !fontsLoaded, 'Root layout cannot report loaded and failed fonts together.');

  return (
    <AnimatedSplashScreen>
      <KeyboardProvider preload={false}>
        <AppNavigationProvider>
          <AppLocaleProvider>
            <DevelopmentRoot>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <PressFeedbackProvider>
                  <FeedbackProvider>
                    <StatusBar style="dark" />
                    <AppStack />
                    <FeedbackOverlay />
                  </FeedbackProvider>
                </PressFeedbackProvider>
              </GestureHandlerRootView>
            </DevelopmentRoot>
          </AppLocaleProvider>
        </AppNavigationProvider>
      </KeyboardProvider>
    </AnimatedSplashScreen>
  );
}
