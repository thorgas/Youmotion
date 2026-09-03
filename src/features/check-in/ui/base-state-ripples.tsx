import { StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedReaction,
  useAnimatedStyle,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
  type FrameInfo,
  type SharedValue,
} from 'react-native-reanimated';
import assert from '@/assert';

import { BASE_RIPPLE_DURATION, BASE_RIPPLE_PHASES, FEELING_PULSE_MEMORY } from '@/constants';
import { palette } from '@/theme';

type RippleRingProps = {
  phase: number;
  progress: SharedValue<number>;
  testID?: string;
};

type BaseStateRipplesProps = {
  offsetX: SharedValue<number>;
  offsetY: SharedValue<number>;
};

function RippleRing({ phase, progress, testID = 'water-ripple-ring' }: RippleRingProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const waveProgress = (progress.value + phase) % 1;

    return {
      opacity: interpolate(waveProgress, [0, 0.14, 0.56, 1], [0, 0.36, 0.15, 0]),
      transform: [{ scale: interpolate(waveProgress, [0, 1], [0.35, 4.3]) }],
    };
  }, [phase, progress]);

  return (
    <Animated.View style={[styles.ring, animatedStyle]} testID={testID}>
      <View style={styles.ringShadow} />
      <View style={styles.ringHighlight} />
    </Animated.View>
  );
}

function RippleOrigin() {
  return (
    <View style={styles.peak} testID="feeling-pulse-peak">
      <View style={styles.peakHighlight} />
      <View style={styles.peakShadow} />
      <View style={styles.origin} testID="ripple-origin">
        <View style={styles.originHighlight} />
      </View>
    </View>
  );
}

export function BaseStateRipples({ offsetX, offsetY }: BaseStateRipplesProps) {
  assert(BASE_RIPPLE_DURATION > 0, 'Ripple duration must be positive.');
  assert(BASE_RIPPLE_PHASES.every((phase) => phase >= 0 && phase < 1), 'Ripple phases must be normalized.');
  const progress = useSharedValue(0);
  const memoryOffsetX = useSharedValue(offsetX.get());
  const memoryOffsetY = useSharedValue(offsetY.get());
  const memoryOpacity = useSharedValue(0);
  const reduceMotion = useReducedMotion();
  const originStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: offsetX.get() },
      { translateY: offsetY.get() },
    ],
  }), [offsetX, offsetY]);
  const memoryStyle = useAnimatedStyle(() => ({
    opacity: memoryOpacity.get(),
    transform: [
      { translateX: memoryOffsetX.get() },
      { translateY: memoryOffsetY.get() },
    ],
  }), [memoryOffsetX, memoryOffsetY, memoryOpacity]);
  const _rememberPosition = (...[
    position,
    previousPosition,
  ]: readonly [
    Readonly<{ x: number; y: number }>,
    Readonly<{ x: number; y: number }> | null,
  ]) => {
    'worklet';
    assert(Number.isFinite(position.x), 'Remembered horizontal ripple position must be finite.');
    assert(Number.isFinite(position.y), 'Remembered vertical ripple position must be finite.');
    if (previousPosition === null) {
      memoryOffsetX.set(position.x);
      memoryOffsetY.set(position.y);
      return;
    }
    if (position.x === previousPosition.x && position.y === previousPosition.y) return;

    memoryOpacity.set(FEELING_PULSE_MEMORY.OPACITY);
    if (reduceMotion) {
      memoryOffsetX.set(position.x);
      memoryOffsetY.set(position.y);
      memoryOpacity.set(withTiming(0, { duration: FEELING_PULSE_MEMORY.REDUCED_MOTION_DURATION }));
      return;
    }

    memoryOffsetX.set(withTiming(position.x, { duration: FEELING_PULSE_MEMORY.DRIFT_DURATION }));
    memoryOffsetY.set(withTiming(position.y, { duration: FEELING_PULSE_MEMORY.DRIFT_DURATION }));
    memoryOpacity.set(withDelay(
      FEELING_PULSE_MEMORY.FADE_DELAY,
      withTiming(0, { duration: FEELING_PULSE_MEMORY.DRIFT_DURATION }),
    ));
  };
  useAnimatedReaction(
    () => ({ x: offsetX.get(), y: offsetY.get() }),
    _rememberPosition,
    [memoryOffsetX, memoryOffsetY, memoryOpacity, offsetX, offsetY, reduceMotion],
  );
  const _advanceRipple = ({ timeSinceFirstFrame }: FrameInfo) => {
    'worklet';
    progress.value = (timeSinceFirstFrame % BASE_RIPPLE_DURATION) / BASE_RIPPLE_DURATION;
  };

  useFrameCallback(_advanceRipple, !reduceMotion);

  return (
    <View pointerEvents="none" style={styles.layer}>
      <Animated.View style={[styles.layer, memoryStyle]} testID="feeling-pulse-memory">
        {BASE_RIPPLE_PHASES.map((phase) => (
          <RippleRing
            key={phase}
            phase={phase}
            progress={progress}
            testID="feeling-pulse-memory-ring"
          />
        ))}
      </Animated.View>
      <Animated.View style={[styles.layer, originStyle]} testID="base-state-ripples">
        {BASE_RIPPLE_PHASES.map((phase) => (
          <RippleRing key={phase} phase={phase} progress={progress} />
        ))}
        <RippleOrigin />
      </Animated.View>
    </View>
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
  peak: {
    position: 'absolute',
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.paperRaised,
    borderColor: palette.whiteWash,
    borderWidth: 1,
    boxShadow: '-4px -5px 10px rgba(255, 255, 255, 0.74), 5px 7px 13px rgba(42, 39, 34, 0.10)',
  },
  peakHighlight: {
    position: 'absolute',
    top: 8,
    left: 10,
    width: 15,
    height: 9,
    borderRadius: 8,
    backgroundColor: palette.whiteWash,
    opacity: 0.72,
    transform: [{ rotate: '-24deg' }],
  },
  peakShadow: {
    position: 'absolute',
    right: 7,
    bottom: 7,
    width: 18,
    height: 11,
    borderRadius: 9,
    backgroundColor: palette.ink,
    opacity: 0.055,
    transform: [{ rotate: '-24deg' }],
  },
  origin: {
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
