import { StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  type FrameInfo,
  type SharedValue,
} from 'react-native-reanimated';

import { BASE_RIPPLE_DURATION, BASE_RIPPLE_PHASES } from '@/constants';
import { palette } from './theme';

type RippleRingProps = {
  phase: number;
  progress: SharedValue<number>;
};

type BaseStateRipplesProps = {
  offsetX: SharedValue<number>;
  offsetY: SharedValue<number>;
};

function RippleRing({ phase, progress }: RippleRingProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const waveProgress = (progress.value + phase) % 1;

    return {
      opacity: interpolate(waveProgress, [0, 0.16, 0.58, 1], [0, 0.34, 0.14, 0]),
      transform: [{ scale: interpolate(waveProgress, [0, 1], [0.35, 4.3]) }],
    };
  }, [phase, progress]);

  return <Animated.View style={[styles.ring, animatedStyle]} />;
}

export function BaseStateRipples({ offsetX, offsetY }: BaseStateRipplesProps) {
  const progress = useSharedValue(0);
  const reduceMotion = useReducedMotion();
  const originStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: offsetX.get() },
      { translateY: offsetY.get() },
    ],
  }), [offsetX, offsetY]);
  const _advanceRipple = ({ timeSinceFirstFrame }: FrameInfo) => {
    'worklet';
    progress.value = (timeSinceFirstFrame % BASE_RIPPLE_DURATION) / BASE_RIPPLE_DURATION;
  };

  useFrameCallback(_advanceRipple, !reduceMotion);

  return (
    <Animated.View pointerEvents="none" style={[styles.layer, originStyle]} testID="base-state-ripples">
      {BASE_RIPPLE_PHASES.map((phase) => (
        <RippleRing key={phase} phase={phase} progress={progress} />
      ))}
      <View style={styles.origin} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1.25,
    borderColor: palette.ink,
  },
  origin: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.ink,
    opacity: 0.3,
  },
});
