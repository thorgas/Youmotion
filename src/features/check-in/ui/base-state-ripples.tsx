import { LinearGradient } from 'expo-linear-gradient';
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
      opacity: interpolate(waveProgress, [0, 0.14, 0.56, 1], [0, 0.36, 0.15, 0]),
      transform: [
        { rotateZ: '-11deg' },
        { scaleX: interpolate(waveProgress, [0, 1], [0.38, 4.45]) },
        { scaleY: interpolate(waveProgress, [0, 1], [0.3, 4.05]) },
      ],
    };
  }, [phase, progress]);

  return (
    <Animated.View style={[styles.ring, animatedStyle]}>
      <View style={styles.ringShade} />
    </Animated.View>
  );
}

function WaterDrop({ progress, reduceMotion }: { progress: SharedValue<number>; reduceMotion: boolean }) {
  const animatedStyle = useAnimatedStyle(() => {
    const pulse = reduceMotion ? 0.5 : progress.value;

    return {
      opacity: interpolate(pulse, [0, 0.5, 1], [0.74, 0.94, 0.74]),
      transform: [
        { rotateZ: `${interpolate(pulse, [0, 0.5, 1], [-13, -9, -13])}deg` },
        { translateY: interpolate(pulse, [0, 0.5, 1], [1, -1.5, 1]) },
        { scale: interpolate(pulse, [0, 0.5, 1], [0.94, 1.04, 0.94]) },
      ],
    };
  }, [progress, reduceMotion]);

  return (
    <Animated.View style={[styles.drop, animatedStyle]} testID="water-drop-core">
      <LinearGradient
        colors={[palette.whiteWash, palette.hairline, palette.ink]}
        end={{ x: 0.82, y: 0.9 }}
        start={{ x: 0.16, y: 0.08 }}
        style={styles.dropGradient}
      />
      <View style={styles.dropHighlight} />
    </Animated.View>
  );
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
      <WaterDrop progress={progress} reduceMotion={reduceMotion} />
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
    width: 74,
    height: 56,
    borderRadius: 37,
    borderWidth: 1.25,
    borderColor: palette.ink,
  },
  ringShade: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 37,
    borderTopWidth: 0.8,
    borderLeftWidth: 0.55,
    borderColor: palette.whiteWash,
    opacity: 0.78,
  },
  drop: {
    position: 'absolute',
    width: 34,
    height: 40,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 22,
    borderBottomRightRadius: 19,
    borderBottomLeftRadius: 16,
    backgroundColor: palette.hairline,
    boxShadow: '4px 7px 9px rgba(42, 39, 34, 0.22)',
  },
  dropGradient: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 22,
    borderBottomRightRadius: 19,
    borderBottomLeftRadius: 16,
  },
  dropHighlight: {
    position: 'absolute',
    top: 7,
    left: 8,
    width: 9,
    height: 6,
    borderRadius: 5,
    backgroundColor: palette.whiteWash,
    opacity: 0.88,
  },
});
