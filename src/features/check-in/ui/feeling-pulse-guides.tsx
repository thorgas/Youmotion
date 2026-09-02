import { Fragment } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { MOTION_DURATION } from '@/constants';
import { palette } from '@/theme';

type FeelingPulseGuidesProps = {
  active: boolean;
  center: number;
  radius: number;
  size: number;
};

const guideScales: readonly number[] = [0.28, 0.5, 0.72, 0.9];
const guideTransition = {
  duration: MOTION_DURATION.STATE,
  reduceMotion: ReduceMotion.System,
};

export function FeelingPulseGuides({
  active,
  center,
  radius,
  size,
}: FeelingPulseGuidesProps) {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: withTiming(active ? 1 : 0.72, guideTransition),
    transform: [{ scale: withTiming(active ? 1 : 0.995, guideTransition) }],
  }), [active]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.layer, { height: size, width: size }, animatedStyle]}
      testID="feeling-pulse-guides">
      <Svg height={size} viewBox={`0 0 ${size} ${size}`} width={size}>
        {guideScales.map((scale) => {
          const guideRadius = radius * scale;
          return (
            <Fragment key={scale}>
              <Circle
                cx={center + 0.8}
                cy={center + 1.1}
                fill="none"
                opacity={0.11}
                r={guideRadius}
                stroke={palette.ink}
                strokeWidth={1.35}
                testID="feeling-pulse-guide-shadow"
              />
              <Circle
                cx={center - 0.7}
                cy={center - 0.9}
                fill="none"
                opacity={0.9}
                r={guideRadius}
                stroke={palette.whiteWash}
                strokeWidth={1.15}
                testID="feeling-pulse-guide-highlight"
              />
              <Circle
                cx={center}
                cy={center}
                fill="none"
                r={guideRadius}
                stroke={palette.hairline}
                strokeWidth={1}
                testID="feeling-pulse-guide"
              />
            </Fragment>
          );
        })}
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
