import { Text as SvgText } from 'react-native-svg';

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
  const showsEmoji = showsBoth
    || (labelMode === EMOTION_LABEL_MODES.EMOJI && !isActive);
  const showsWord = labelMode === EMOTION_LABEL_MODES.TEXT
    || showsBoth
    || (labelMode === EMOTION_LABEL_MODES.EMOJI && isActive);

  return (
    <>
      {showsEmoji ? (
        <SvgText
          fill={palette.ink}
          fontSize={22}
          key={`${emotion.id}-emoji`}
          testID={`base-emotion-emoji-${emotion.id}`}
          textAnchor="middle"
          x={x}
          y={showsBoth ? y - 9 : y}>
          {emotionEmoji(emotion.id)}
        </SvgText>
      ) : null}
      {showsWord ? (
        <SvgText
          fill={palette.ink}
          fontFamily={type.medium}
          fontSize={showsBoth ? textSize.metadata : textSize.emphasis}
          key={`${emotion.id}-word`}
          letterSpacing={0.3}
          opacity={0.88}
          testID={`base-emotion-label-${emotion.id}`}
          textAnchor="middle"
          x={x}
          y={showsBoth ? y + 11 : y}>
          {emotionName(emotion.id)}
        </SvgText>
      ) : null}
    </>
  );
}
