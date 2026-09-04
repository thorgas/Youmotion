import { StyleSheet, Text } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  ReduceMotion,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import assert from '@/assert';

import { EMOTION_LABEL_MODES, MOTION_DURATION } from '@/constants';
import type { EmotionLabelMode } from '@/preferences/emotion-label-mode';
import type { Emotion } from '../domain/emotion';
import { emotionEmoji, emotionName } from './emotion-copy';
import { palette, textSize, type } from '@/theme';

type EmotionAxisLabelProps = {
  emotion: Emotion;
  isActive: boolean;
  labelMode: EmotionLabelMode;
  x: number;
  y: number;
};

const labelEntering = FadeIn
  .duration(MOTION_DURATION.MICRO)
  .reduceMotion(ReduceMotion.System);
const labelExiting = FadeOut
  .duration(MOTION_DURATION.MICRO)
  .reduceMotion(ReduceMotion.System);
const stateAnimation = {
  duration: MOTION_DURATION.STATE,
  reduceMotion: ReduceMotion.System,
};

export function EmotionAxisLabel({
  emotion,
  isActive,
  labelMode,
  x,
  y,
}: EmotionAxisLabelProps) {
  assert(emotion.nuanceCount > 0, 'Emotion axis labels require at least one nuance.');
  assert(Number.isFinite(x) && Number.isFinite(y), 'Emotion axis coordinates must be finite.');
  const showsBoth = labelMode === EMOTION_LABEL_MODES.BOTH;
  const showsWord = labelMode === EMOTION_LABEL_MODES.TEXT || isActive;
  const activeStyle = useAnimatedStyle(() => ({
    transform: [{
      scale: withTiming(isActive ? 1.04 : 1, stateAnimation),
    }],
  }), [isActive]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        {
          left: x - 52,
          top: y - 27,
        },
        activeStyle,
      ]}
      testID={`base-emotion-axis-${emotion.id}`}>
      {showsBoth || !showsWord ? (
        <Animated.View
          entering={labelEntering}
          exiting={labelExiting}
          key={`${emotion.id}-emoji`}>
          <Text
            style={[styles.emoji, showsBoth && styles.combinedEmoji]}
            testID={`base-emotion-emoji-${emotion.id}`}>
            {emotionEmoji(emotion.id)}
          </Text>
        </Animated.View>
      ) : null}
      {showsBoth || showsWord ? (
        <Animated.View
          entering={labelEntering}
          exiting={labelExiting}
          key={`${emotion.id}-word`}>
          <Text
            style={[styles.word, showsBoth && styles.combinedWord]}
            testID={`base-emotion-label-${emotion.id}`}>
            {emotionName(emotion.id)}
          </Text>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: 104,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    color: palette.ink,
    fontSize: 22,
    lineHeight: 27,
    textAlign: 'center',
  },
  combinedEmoji: {
    height: 27,
  },
  word: {
    color: palette.ink,
    fontFamily: type.medium,
    fontSize: textSize.emphasis,
    letterSpacing: 0.3,
    lineHeight: 27,
    opacity: 0.88,
    textAlign: 'center',
  },
  combinedWord: {
    fontSize: textSize.metadata,
    height: 20,
    lineHeight: 18,
  },
});
