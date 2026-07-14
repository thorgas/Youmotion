import { useCallback, useMemo } from 'react';
import { PanResponder, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';

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
  marker: { x: number; y: number } | null;
  radius: number;
  selection: EmotionSelection | null;
  size: number;
};

const _polar = ({ center, radius, angle }: { center: number; radius: number; angle: number }) => ({
  x: center + Math.cos(angle) * radius,
  y: center + Math.sin(angle) * radius,
});

const _markerPoint = ({ center, radius, selection }: {
  center: number;
  radius: number;
  selection: EmotionSelection | null;
}) => {
  if (!selection) return null;
  const selectedIndex = emotions.findIndex((emotion) => emotion.id === selection.emotionId);
  if (selectedIndex < 0) return null;
  return _polar({
    center,
    radius: radius * (0.18 + selection.intensity * 0.62),
    angle: emotionAngle(selectedIndex),
  });
};

function EmotionField({ center, marker, radius, selection, size }: EmotionFieldProps) {
  return (
    <>
      {selection ? null : <BaseStateRipples />}
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {selection ? [0.28, 0.5, 0.72, 0.9].map((scale) => (
          <Circle key={scale} cx={center} cy={center} r={radius * scale} fill="none" stroke={palette.hairline} strokeWidth={1} strokeDasharray="2 7" />
        )) : null}

        {marker ? (
          <G>
            <Path d={`M ${center} ${center} L ${marker.x} ${marker.y}`} stroke={selection?.color ?? palette.ink} strokeOpacity={0.28} strokeWidth={1} />
            <Circle cx={center} cy={center} r={4} fill={palette.ink} fillOpacity={0.3} />
            <Circle cx={marker.x} cy={marker.y} r={12} fill={selection?.color ?? palette.ink} fillOpacity={0.12} />
            <Circle cx={marker.x} cy={marker.y} r={5} fill={selection?.color ?? palette.ink} />
          </G>
        ) : null}

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

  const _updateSelection = useCallback(({ x, y }: { x: number; y: number }) => {
    onSelectionChange(selectionFromPoint({
      point: { x, y },
      center: { x: center, y: center },
      maxRadius: radius * 0.8,
    }));
  }, [center, onSelectionChange, radius]);

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

  const marker = _markerPoint({ center, radius, selection });

  return (
    <View style={styles.frame}>
      <View
        accessibilityLabel={emotionStarAccessibility(selection)}
        accessibilityRole="adjustable"
        style={[styles.canvas, { width: size, height: size }]}
        {...responder.panHandlers}>
        <EmotionField center={center} marker={marker} radius={radius} selection={selection} size={size} />
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
