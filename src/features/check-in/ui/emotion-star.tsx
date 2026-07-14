import { useCallback, useMemo } from 'react';
import { PanResponder, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';

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

const _polar = ({ center, radius, angle }: { center: number; radius: number; angle: number }) => ({
  x: center + Math.cos(angle) * radius,
  y: center + Math.sin(angle) * radius,
});

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
          const label = _polar({ center, radius: radius * 0.72, angle });
          const isActive = selection !== null && selection.emotionId === emotion.id;
          return (
            <SvgText
              key={`${emotion.id}-label`}
              x={label.x}
              y={label.y + 4}
              textAnchor="middle"
              fill={palette.ink}
              fillOpacity={isActive ? 0.88 : 0.2}
              fontFamily={isActive ? type.sansMedium : type.sans}
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

export function EmotionStar({ selection, disabled, onTouchStart, onSelectionChange, onRelease }: EmotionStarProps) {
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
        onPanResponderRelease: onRelease,
        onPanResponderTerminate: onRelease,
      }),
    [_updateSelection, disabled, onRelease, onTouchStart],
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

      <View style={styles.readout}>
        <Text style={[styles.readoutEmotion, selection ? styles.readoutEmotionSelected : null]}>
          {selection ? emotionNuance(selection) : <fbt desc="Prompt inside the emotion star before touching">Touch</fbt>}
        </Text>
        <Text style={styles.readoutNuance}>
          {selection ? emotionName(selection.emotionId) : <fbt desc="Second half of the emotion star gesture prompt">and drag outward</fbt>}
        </Text>
      </View>
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
  readoutEmotion: {
    color: palette.ink,
    fontFamily: type.sansMedium,
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
    fontFamily: type.sans,
    fontSize: 11,
    letterSpacing: 0.8,
    marginTop: 7,
    textAlign: 'center',
  },
});
