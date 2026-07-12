import { useCallback, useMemo } from 'react';
import { PanResponder, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  Polygon,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import { emotionAngle, selectionFromPoint } from '../domain/emotion-selection';
import { emotions, type EmotionSelection } from '../domain/emotion';
import { palette, type } from './theme';

type EmotionStarProps = {
  selection: EmotionSelection | null;
  disabled?: boolean;
  onTouchStart: () => void;
  onSelectionChange: (selection: EmotionSelection | null) => void;
  onRelease: () => void;
};

const _polar = ({ center, radius, angle }: { center: number; radius: number; angle: number }) => ({
  x: center + Math.cos(angle) * radius,
  y: center + Math.sin(angle) * radius,
});

const _petalPath = ({ center, radius, angle, activeAmount }: {
  center: number;
  radius: number;
  angle: number;
  activeAmount: number;
}) => {
  const halfStep = Math.PI / emotions.length;
  const tip = _polar({ center, radius: radius * (0.72 + activeAmount * 0.17), angle });
  const left = _polar({ center, radius: radius * 0.33, angle: angle - halfStep * 0.78 });
  const right = _polar({ center, radius: radius * 0.33, angle: angle + halfStep * 0.78 });
  const leftCurve = _polar({ center, radius: radius * 0.57, angle: angle - halfStep * 0.44 });
  const rightCurve = _polar({ center, radius: radius * 0.57, angle: angle + halfStep * 0.44 });
  return [
    `M ${center} ${center}`,
    `Q ${left.x} ${left.y} ${leftCurve.x} ${leftCurve.y}`,
    `Q ${tip.x} ${tip.y} ${rightCurve.x} ${rightCurve.y}`,
    `Q ${right.x} ${right.y} ${center} ${center}`,
    'Z',
  ].join(' ');
};

const _activeAmount = ({ selection, emotionId }: {
  selection: EmotionSelection | null;
  emotionId: EmotionSelection['emotionId'];
}) => {
  if (!selection) return 0;
  if (selection.emotionId !== emotionId) return 0;
  return selection.intensity;
};

const _starPoints = ({ center, radius, selection }: {
  center: number;
  radius: number;
  selection: EmotionSelection | null;
}) => emotions.flatMap((emotion, index) => {
  const angle = emotionAngle(index);
  const active = _activeAmount({ selection, emotionId: emotion.id });
  const outer = _polar({ center, radius: radius * (0.72 + active * 0.17), angle });
  const inner = _polar({ center, radius: radius * 0.31, angle: angle + Math.PI / emotions.length });
  return [`${outer.x},${outer.y}`, `${inner.x},${inner.y}`];
}).join(' ');

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

const _accessibilityLabel = (selection: EmotionSelection | null) => {
  if (!selection) return 'Gefühlsstern. Ziehe vom Zentrum nach außen.';
  return `${selection.emotion}, ${selection.nuance}, Intensität ${Math.round(selection.intensity * 100)} Prozent`;
};

export function EmotionStar({ selection, disabled, onTouchStart, onSelectionChange, onRelease }: EmotionStarProps) {
  const { width } = useWindowDimensions();
  const size = Math.min(width - 68, 370);
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

  const starPoints = _starPoints({ center, radius, selection });
  const marker = _markerPoint({ center, radius, selection });

  return (
    <View
      accessibilityLabel={_accessibilityLabel(selection)}
      accessibilityRole="adjustable"
      style={styles.frame}
      {...responder.panHandlers}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          {emotions.map((emotion) => (
            <LinearGradient key={emotion.id} id={`wash-${emotion.id}`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={emotion.wash} stopOpacity="0.36" />
              <Stop offset="0.48" stopColor={emotion.color} stopOpacity="0.78" />
              <Stop offset="1" stopColor={emotion.wash} stopOpacity="0.48" />
            </LinearGradient>
          ))}
        </Defs>

        {[0.25, 0.45, 0.65, 0.82].map((scale) => (
          <Circle key={scale} cx={center} cy={center} r={radius * scale} fill="none" stroke={palette.hairline} strokeWidth={1} strokeDasharray="2 5" />
        ))}

        <G>
          {emotions.map((emotion, index) => {
            const active = _activeAmount({ selection, emotionId: emotion.id });
            const path = _petalPath({ center, radius, angle: emotionAngle(index), activeAmount: active });
            return (
              <G key={emotion.id}>
                <Path d={path} fill={`url(#wash-${emotion.id})`} opacity={selection && !active ? 0.54 : 0.9} />
                <Path d={path} fill={emotion.wash} opacity={0.16} transform={`rotate(${index % 2 ? -1.2 : 1.1} ${center} ${center})`} />
              </G>
            );
          })}
        </G>

        <Polygon points={starPoints} fill="none" stroke="rgba(53, 47, 40, 0.34)" strokeWidth={1.2} />
        <Circle cx={center} cy={center} r={radius * 0.17} fill="#F8F4EC" fillOpacity={0.88} stroke="rgba(63, 57, 50, 0.18)" />
        <Circle cx={center} cy={center} r={4} fill={palette.ink} fillOpacity={0.62} />

        {emotions.map((emotion, index) => {
          const angle = emotionAngle(index);
          const label = _polar({ center, radius: radius * 0.96, angle });
          const isActive = selection !== null && selection.emotionId === emotion.id;
          const anchor = Math.cos(angle) > 0.25 ? 'end' : Math.cos(angle) < -0.25 ? 'start' : 'middle';
          return (
            <SvgText
              key={`${emotion.id}-label`}
              x={label.x}
              y={label.y + 4}
              textAnchor={anchor}
              fill={isActive ? emotion.color : palette.inkMuted}
              fontFamily={type.sansSemibold}
              fontSize={isActive ? 13 : 11}
              letterSpacing={0.4}>
              {emotion.name.toUpperCase()}
            </SvgText>
          );
        })}

        {marker ? (
          <G>
            <Circle cx={marker.x} cy={marker.y} r={13} fill="#FFFFFF" fillOpacity={0.44} />
            <Circle cx={marker.x} cy={marker.y} r={7} fill={selection?.color ?? palette.ink} stroke="#FFFFFF" strokeWidth={2} />
          </G>
        ) : null}
      </Svg>

      <View style={styles.readout}>
        <Text style={[styles.readoutEmotion, selection && { color: selection.color }]}>
          {selection?.emotion ?? 'Berühren'}
        </Text>
        <Text style={styles.readoutNuance}>{selection?.nuance ?? 'und nach außen ziehen'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    maxWidth: 370,
    aspectRatio: 1,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  readout: {
    position: 'absolute',
    pointerEvents: 'none',
    alignItems: 'center',
    width: 150,
  },
  readoutEmotion: {
    color: palette.ink,
    fontFamily: type.sansSemibold,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  readoutNuance: {
    color: palette.inkMuted,
    fontFamily: type.sans,
    fontSize: 10,
    marginTop: 1,
    textAlign: 'center',
  },
});
