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
import assert from '@/assert';

import { BASE_RIPPLE_DURATION, BASE_RIPPLE_PHASES } from '@/constants';
import { palette } from '@/theme';

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
      opacity: interpolate(waveProgress, [0, 0.14, 0.56, 1], [0, 0.36, 0.15, 0]),
      transform: [{ scale: interpolate(waveProgress, [0, 1], [0.35, 4.3]) }],
    };
  }, [phase, progress]);

  return (
    <Animated.View style={[styles.ring, animatedStyle]} testID="water-ripple-ring">
      <View style={styles.ringShadow} />
      <View style={styles.ringHighlight} />
    </Animated.View>
  );
}

function RippleOrigin() {
  return (
    <View style={styles.origin} testID="ripple-origin">
      <View style={styles.originHighlight} />
    </View>
  );
}

export function BaseStateRipples({ offsetX, offsetY }: BaseStateRipplesProps) {
  assert(BASE_RIPPLE_DURATION > 0, 'Ripple duration must be positive.');
  assert(BASE_RIPPLE_PHASES.every((phase) => phase >= 0 && phase < 1), 'Ripple phases must be normalized.');
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
      <RippleOrigin />
    </Animated.View>
  );
}

export function CenteredBaseStateRipples() {
  assert(BASE_RIPPLE_PHASES.length > 0, 'Centered ripples require at least one phase.');
  assert(BASE_RIPPLE_DURATION > 0, 'Centered ripple duration must be positive.');
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  return <BaseStateRipples offsetX={offsetX} offsetY={offsetY} />;
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
  ringShadow: {
    position: 'absolute',
    top: 1,
    right: -1,
    bottom: -1,
    left: 1,
    borderRadius: 36,
    borderBottomWidth: 1.4,
    borderRightWidth: 1.4,
    borderBottomColor: palette.ink,
    borderRightColor: palette.ink,
    opacity: 0.34,
  },
  ringHighlight: {
    position: 'absolute',
    top: -1,
    right: 1,
    bottom: 1,
    left: -1,
    borderRadius: 36,
    borderTopWidth: 1.15,
    borderLeftWidth: 1.15,
    borderTopColor: palette.whiteWash,
    borderLeftColor: palette.whiteWash,
    opacity: 0.9,
  },
  origin: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.ink,
    boxShadow: '1px 2px 3px rgba(42, 39, 34, 0.24)',
  },
  originHighlight: {
    position: 'absolute',
    top: 1,
    left: 1,
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: palette.whiteWash,
    opacity: 0.82,
  },
});
