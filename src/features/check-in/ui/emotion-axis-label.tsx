import { StyleSheet, Text, View } from 'react-native';

import { EMOTION_LABEL_MODES } from '@/constants';
import type { EmotionLabelMode } from '@/features/settings/domain/emotion-label-mode';
import type { Emotion } from '../domain/emotion';
import { emotionEmoji, emotionName } from './emotion-copy';
import { palette, textSize, type } from './theme';

type EmotionAxisLabelProps = {
  emotion: Emotion;
  isActive: boolean;
  labelMode: EmotionLabelMode;
  x: number;
  y: number;
};

export function EmotionAxisLabel({
  emotion,
  isActive,
  labelMode,
  x,
  y,
}: EmotionAxisLabelProps) {
  const showsBoth = labelMode === EMOTION_LABEL_MODES.BOTH;
  const showsWord = labelMode === EMOTION_LABEL_MODES.TEXT || isActive;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.container,
        {
          left: x - 52,
          top: y - 27,
        },
      ]}
      testID={`base-emotion-axis-${emotion.id}`}>
      {showsBoth || !showsWord ? (
        <Text
          key={`${emotion.id}-emoji`}
          style={[styles.emoji, showsBoth && styles.combinedEmoji]}
          testID={`base-emotion-emoji-${emotion.id}`}>
          {emotionEmoji(emotion.id)}
        </Text>
      ) : null}
      {showsBoth || showsWord ? (
        <Text
          key={`${emotion.id}-word`}
          style={[styles.word, showsBoth && styles.combinedWord]}
          testID={`base-emotion-label-${emotion.id}`}>
          {emotionName(emotion.id)}
        </Text>
      ) : null}
    </View>
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
