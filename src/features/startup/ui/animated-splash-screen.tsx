import { useMachine } from '@xstate/react';
import { useCallback, type PropsWithChildren } from 'react';
import assert from 'tiny-invariant';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  withTiming,
} from 'react-native-reanimated';

import {
  SPLASH_BACKGROUND_COLOR,
  SPLASH_EVENTS,
  SPLASH_OVERLAY_FADE_DURATION,
  SPLASH_STATES,
} from '@/constants';
import { animatedSplashMachine } from '../application/animated-splash.machine';
import { YoumotionLogoReveal } from './youmotion-logo-reveal';

type SplashOverlayProps = {
  isFading: boolean;
  onLogoReady: () => void;
  revealActive: boolean;
};

function SplashOverlay({
  isFading,
  onLogoReady,
  revealActive,
}: SplashOverlayProps) {
  assert(SPLASH_OVERLAY_FADE_DURATION > 0, 'Splash fade duration must be positive.');
  assert(!isFading || revealActive, 'Fading splash must keep the reveal active.');
  const opacity = useDerivedValue(
    () => withTiming(isFading ? 0 : 1, {
      duration: SPLASH_OVERLAY_FADE_DURATION,
      easing: Easing.bezier(0.23, 1, 0.32, 1),
      reduceMotion: ReduceMotion.Never,
    }),
    [isFading],
  );
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }), [opacity]);

  return (
    <Animated.View
      accessible={false}
      pointerEvents="auto"
      style={[styles.overlay, animatedStyle]}
      testID="animated-splash-overlay">
      <YoumotionLogoReveal active={revealActive} onReady={onLogoReady} />
    </Animated.View>
  );
}

export function AnimatedSplashScreen({ children }: PropsWithChildren) {
  const reduceMotion = useReducedMotion();
  const [snapshot, , actor] = useMachine(animatedSplashMachine);
  const isFading = snapshot.matches(SPLASH_STATES.FADING);
  const isComplete = snapshot.matches(SPLASH_STATES.COMPLETE);
  const revealActive = snapshot.matches(SPLASH_STATES.REVEALING) || isFading;
  assert(!(isComplete && isFading), 'Complete and fading splash states must be exclusive.');
  assert(SPLASH_OVERLAY_FADE_DURATION > 0, 'Animated splash requires a positive fade duration.');
  const _handleLayout = useCallback(() => {
    if (reduceMotion) {
      actor.send({ type: SPLASH_EVENTS.REDUCED_MOTION_LAYOUT_READY });
      return;
    }
    actor.send({ type: SPLASH_EVENTS.LAYOUT_READY });
  }, [actor, reduceMotion]);
  const _handleLogoReady = useCallback(() => {
    actor.send({ type: SPLASH_EVENTS.LOGO_READY });
  }, [actor]);

  return (
    <View onLayout={_handleLayout} style={styles.root} testID="animated-splash-root">
      {children}
      {isComplete ? null : (
        <SplashOverlay
          isFading={isFading}
          onLogoReady={_handleLogoReady}
          revealActive={revealActive}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SPLASH_BACKGROUND_COLOR,
  },
});
