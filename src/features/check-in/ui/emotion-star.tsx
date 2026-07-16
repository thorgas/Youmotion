import { useCallback, useMemo } from 'react';
import { PanResponder, StyleSheet, Text, useWindowDimensions, View, type StyleProp, type TextStyle } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  type SharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';

import { EMOTION_TEXT_REVEAL_DURATION, EMOTION_TEXT_REVEAL_STAGGER } from '@/constants';
import { emotionAngle, selectionFromPoint } from '../domain/emotion-selection';
import { emotions, type EmotionSelection } from '../domain/emotion';
import { BaseStateRipples } from './base-state-ripples';
import { emotionName, emotionNuance, emotionStarAccessibility } from './emotion-copy';
import { palette, type } from './theme';

type EmotionStarProps = {
  selection: EmotionSelection | null;
  disabled?: boolean;
  onTouchStart: () => void;
  onSelectionChange: (selection: EmotionSelection | null) => void;
  onCancel: () => void;
  onRelease: () => void;
};

type EmotionFieldProps = {
  center: number;
  radius: number;
  rippleOffsetX: SharedValue<number>;
  rippleOffsetY: SharedValue<number>;
  selection: EmotionSelection | null;
  size: number;
};

type RevealedTextProps = {
  delay: number;
  style: StyleProp<TextStyle>;
  testID: string;
  text: string;
};

type RevealedCharacterProps = {
  character: string;
  index: number;
  length: number;
  progress: Readonly<Pick<SharedValue<number>, 'value'>>;
  style: StyleProp<TextStyle>;
};

const _polar = ({ center, radius, angle }: { center: number; radius: number; angle: number }) => ({
  x: center + Math.cos(angle) * radius,
  y: center + Math.sin(angle) * radius,
});

function RevealedCharacter({ character, index, length, progress, style }: RevealedCharacterProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const staggerRange = 0.64;
    const start = length <= 1 ? 0 : (index / (length - 1)) * staggerRange;
    const characterProgress = interpolate(
      progress.value,
      [start, Math.min(start + 0.36, 1)],
      [0, 1],
      'clamp',
    );

    return {
      opacity: interpolate(characterProgress, [0, 0.72, 1], [0, 0.92, 1]),
      transform: [
        { translateX: interpolate(characterProgress, [0, 0.72, 1], [-9, 1.5, 0]) },
        { scale: interpolate(characterProgress, [0, 0.72, 1], [0.96, 1.015, 1]) },
      ],
    };
  }, [index, length, progress]);

  return <Animated.Text accessible={false} style={[style, animatedStyle]}>{character}</Animated.Text>;
}

function RevealedText({ delay, style, testID, text }: RevealedTextProps) {
  const reduceMotion = useReducedMotion();
  const characters = Array.from(text);
  const progress = useSharedValue(reduceMotion ? 1 : 0);
  const hasStarted = useSharedValue(reduceMotion);
  const _startReveal = () => {
    'worklet';
    if (hasStarted.value) return;
    hasStarted.value = true;
    progress.value = withDelay(delay, withTiming(1, {
      duration: EMOTION_TEXT_REVEAL_DURATION,
      easing: Easing.bezier(0.3, 0, 0.2, 1),
    }));
  };

  useFrameCallback(_startReveal, true);

  return (
    <View accessibilityLabel={text} accessible style={styles.revealLine} testID={testID}>
      {characters.map((character, index) => (
        <RevealedCharacter
          key={text.slice(0, index + 1)}
          character={character}
          index={index}
          length={characters.length}
          progress={progress}
          style={style}
        />
      ))}
    </View>
  );
}

function EmotionReadout({ selection }: { selection: EmotionSelection }) {
  const revealKey = `${selection.emotionId}-${selection.level}`;

  return (
    <View key={revealKey} style={styles.readout}>
      <RevealedText
        delay={0}
        style={[styles.readoutEmotion, styles.readoutEmotionSelected]}
        testID="emotion-nuance-reveal"
        text={emotionNuance(selection)}
      />
      <RevealedText
        delay={EMOTION_TEXT_REVEAL_STAGGER}
        style={styles.readoutNuance}
        testID="emotion-name-reveal"
        text={emotionName(selection.emotionId)}
      />
    </View>
  );
}

function EmotionField({ center, radius, rippleOffsetX, rippleOffsetY, selection, size }: EmotionFieldProps) {
  return (
    <>
      <BaseStateRipples offsetX={rippleOffsetX} offsetY={rippleOffsetY} />
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {selection ? [0.28, 0.5, 0.72, 0.9].map((scale) => (
          <Circle key={scale} cx={center} cy={center} r={radius * scale} fill="none" stroke={palette.hairline} strokeWidth={1} strokeDasharray="2 7" />
        )) : null}

        {emotions.map((emotion, index) => {
          const angle = emotionAngle(index);
          const label = _polar({ center, radius: radius * 0.86, angle });
          const isActive = selection !== null && selection.emotionId === emotion.id;
          return (
            <SvgText
              key={`${emotion.id}-label`}
              x={label.x}
              y={label.y + 4}
              textAnchor="middle"
              fill={palette.ink}
              fillOpacity={isActive ? 0.88 : 0.2}
              fontFamily={isActive ? type.medium : type.regular}
              fontSize={isActive ? 12 : 10}
              letterSpacing={0.3}>
              {emotionName(emotion.id)}
            </SvgText>
          );
        })}
      </Svg>
    </>
  );
}

export function EmotionStar({ selection, disabled, onTouchStart, onSelectionChange, onCancel, onRelease }: EmotionStarProps) {
  const { width } = useWindowDimensions();
  const size = Math.min(width - 32, 390);
  const center = size / 2;
  const radius = size * 0.45;
  const rippleOffsetX = useSharedValue(0);
  const rippleOffsetY = useSharedValue(0);

  const _updateSelection = useCallback(({ x, y }: { x: number; y: number }) => {
    rippleOffsetX.set(x - center);
    rippleOffsetY.set(y - center);
    onSelectionChange(selectionFromPoint({
      point: { x, y },
      center: { x: center, y: center },
      maxRadius: radius * 0.8,
    }));
  }, [center, onSelectionChange, radius, rippleOffsetX, rippleOffsetY]);

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onMoveShouldSetPanResponder: () => !disabled,
        onPanResponderGrant: (event) => {
          onTouchStart();
          _updateSelection({ x: event.nativeEvent.locationX, y: event.nativeEvent.locationY });
        },
        onPanResponderMove: (event) => _updateSelection({ x: event.nativeEvent.locationX, y: event.nativeEvent.locationY }),
        onPanResponderTerminationRequest: () => false,
        onPanResponderRelease: onRelease,
        onPanResponderTerminate: onCancel,
      }),
    [_updateSelection, disabled, onCancel, onRelease, onTouchStart],
  );

  return (
    <View style={styles.frame}>
      <View
        accessibilityLabel={emotionStarAccessibility(selection)}
        accessibilityRole="adjustable"
        style={[styles.canvas, { width: size, height: size }]}
        {...responder.panHandlers}>
        <EmotionField
          center={center}
          radius={radius}
          rippleOffsetX={rippleOffsetX}
          rippleOffsetY={rippleOffsetY}
          selection={selection}
          size={size}
        />
      </View>

      {selection ? <EmotionReadout selection={selection} /> : (
        <View style={styles.readout}>
          <Text style={styles.readoutEmotion}><fbt desc="Prompt inside the emotion star before touching">Touch</fbt></Text>
          <Text style={styles.readoutNuance}><fbt desc="Second half of the emotion star gesture prompt">and drag outward</fbt></Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    alignSelf: 'center',
    alignItems: 'center',
  },
  canvas: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  readout: {
    pointerEvents: 'none',
    alignItems: 'center',
    width: 260,
    minHeight: 54,
    marginTop: -2,
  },
  revealLine: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: 260,
  },
  readoutEmotion: {
    color: palette.ink,
    fontFamily: type.medium,
    fontSize: 16,
    letterSpacing: 0.8,
    opacity: 0.82,
  },
  readoutEmotionSelected: {
    fontSize: 20,
    letterSpacing: 0.7,
    opacity: 0.92,
  },
  readoutNuance: {
    color: palette.inkMuted,
    fontFamily: type.regular,
    fontSize: 11,
    letterSpacing: 0.8,
    marginTop: 7,
    textAlign: 'center',
  },
});
