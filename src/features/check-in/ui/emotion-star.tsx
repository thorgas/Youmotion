import { useCallback, useMemo } from 'react';
import { useSelector } from '@xstate/store-react';
import { PanResponder, StyleSheet, Text, useWindowDimensions, View, type StyleProp, type TextStyle } from 'react-native';
import Animated, {
  FadeInDown,
  FadeOut,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { MOTION_DURATION, MOTION_OFFSET } from '@/constants';
import { appSettingsStore } from '@/features/settings/application/app-settings.store';
import type { EmotionLabelMode } from '@/features/settings/domain/emotion-label-mode';
import { emotionAngle, selectionFromPoint } from '../domain/emotion-selection';
import { emotions, type EmotionSelection } from '../domain/emotion';
import {
  BaseStateRipples,
  CenteredBaseStateRipples,
} from './base-state-ripples';
import { EmotionAxisLabel } from './emotion-axis-label';
import { emotionName, emotionNuance, emotionStarAccessibility } from './emotion-copy';
import { palette, textSize, type } from './theme';

type EmotionStarProps = {
  selection: EmotionSelection | null;
  centerOrigin?: boolean;
  disabled?: boolean;
  onTouchStart: () => void;
  onSelectionChange: (selection: EmotionSelection | null) => void;
  onCancel: () => void;
  onRelease: () => void;
};

type EmotionFieldProps = {
  centerOrigin: boolean;
  center: number;
  radius: number;
  rippleOffsetX: SharedValue<number>;
  rippleOffsetY: SharedValue<number>;
  selection: EmotionSelection | null;
  size: number;
  labelMode: EmotionLabelMode;
};

type ReadoutTextProps = {
  style: StyleProp<TextStyle>;
  testID: string;
  text: string;
};

const _selectEmotionLabelMode = (state: ReturnType<typeof appSettingsStore.getSnapshot>) => (
  state.context.emotionLabelMode
);

const readoutEntering = FadeInDown
  .duration(MOTION_DURATION.STATE)
  .reduceMotion(ReduceMotion.System)
  .withInitialValues({
    opacity: 0,
    transform: [{ translateY: MOTION_OFFSET.STATE }],
  });
const readoutExiting = FadeOut
  .duration(MOTION_DURATION.MICRO)
  .reduceMotion(ReduceMotion.System);
const stateAnimation = {
  duration: MOTION_DURATION.STATE,
  reduceMotion: ReduceMotion.System,
};

const _polar = ({ center, radius, angle }: { center: number; radius: number; angle: number }) => ({
  x: center + Math.cos(angle) * radius,
  y: center + Math.sin(angle) * radius,
});

function ReadoutText({ style, testID, text }: ReadoutTextProps) {
  return (
    <View accessibilityLabel={text} accessible style={styles.revealLine} testID={testID}>
      <Text accessible={false} style={style}>{text}</Text>
    </View>
  );
}

function EmotionReadout({ selection }: { selection: EmotionSelection }) {
  return (
    <Animated.View
      entering={readoutEntering}
      exiting={readoutExiting}
      style={styles.selectedReadout}
      testID="emotion-readout-selection">
      <ReadoutText
        style={[styles.readoutEmotion, styles.readoutEmotionSelected]}
        testID="emotion-nuance-reveal"
        text={emotionNuance(selection)}
      />
      <ReadoutText
        style={styles.readoutNuance}
        testID="emotion-name-reveal"
        text={emotionName(selection.emotionId)}
      />
    </Animated.View>
  );
}

function EmotionField({
  center,
  centerOrigin,
  labelMode,
  radius,
  rippleOffsetX,
  rippleOffsetY,
  selection,
  size,
}: EmotionFieldProps) {
  const guideStyle = useAnimatedStyle(() => ({
    opacity: withTiming(selection ? 1 : 0, stateAnimation),
    transform: [{
      scale: withTiming(selection ? 1 : 0.985, stateAnimation),
    }],
  }), [selection]);

  return (
    <>
      {centerOrigin
        ? <CenteredBaseStateRipples />
        : <BaseStateRipples offsetX={rippleOffsetX} offsetY={rippleOffsetY} />}
      <Animated.View style={[styles.guide, { height: size, width: size }, guideStyle]}>
        <Svg height={size} viewBox={`0 0 ${size} ${size}`} width={size}>
          {[0.28, 0.5, 0.72, 0.9].map((scale) => (
          <Circle key={scale} cx={center} cy={center} r={radius * scale} fill="none" stroke={palette.hairline} strokeWidth={1} strokeDasharray="2 7" />
          ))}
        </Svg>
      </Animated.View>
      {emotions.map((emotion, index) => {
        const angle = emotionAngle(index);
        const label = _polar({ center, radius: radius * 0.86, angle });
        const isActive = selection !== null && selection.emotionId === emotion.id;
        return (
          <EmotionAxisLabel
            emotion={emotion}
            isActive={isActive}
            key={`${emotion.id}-label`}
            labelMode={labelMode}
            x={label.x}
            y={label.y + 4}
          />
        );
      })}
    </>
  );
}

export function EmotionStar({
  centerOrigin = false,
  selection,
  disabled,
  onTouchStart,
  onSelectionChange,
  onCancel,
  onRelease,
}: EmotionStarProps) {
  const labelMode = useSelector(appSettingsStore, _selectEmotionLabelMode);
  const { width } = useWindowDimensions();
  const size = Math.min(width - 32, 390);
  const center = size / 2;
  const radius = size * 0.45;
  const rippleOffsetX = useSharedValue(0);
  const rippleOffsetY = useSharedValue(0);
  const promptStyle = useAnimatedStyle(() => ({
    opacity: withTiming(selection ? 0 : 1, stateAnimation),
    transform: [{
      translateY: withTiming(selection ? -MOTION_OFFSET.STATE : 0, stateAnimation),
    }],
  }), [selection]);

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
    <View style={styles.frame} testID="emotion-star-frame">
      <View style={styles.readout} testID="emotion-readout">
        <Animated.View
          accessibilityElementsHidden={selection !== null}
          importantForAccessibility={selection ? 'no-hide-descendants' : 'auto'}
          style={[styles.readoutPrompt, promptStyle]}
          testID="emotion-readout-prompt">
          <Text style={styles.readoutEmotion}><fbt desc="Prompt above the emotion star before touching">Touch the point</fbt></Text>
          <Text style={styles.readoutNuance}><fbt desc="Second line of the emotion star gesture prompt">and move your finger.</fbt></Text>
          <Text style={styles.readoutRelease}><fbt desc="Third line explaining how to confirm an emotion selection">Release your finger to select the feeling.</fbt></Text>
        </Animated.View>
        {selection ? <EmotionReadout selection={selection} /> : null}
      </View>
      <View
        accessibilityLabel={emotionStarAccessibility(selection)}
        accessibilityRole="adjustable"
        accessibilityValue={{ text: labelMode }}
        style={[styles.canvas, { width: size, height: size }]}
        testID="emotion-star"
        {...responder.panHandlers}>
        <EmotionField
          center={center}
          centerOrigin={centerOrigin}
          labelMode={labelMode}
          radius={radius}
          rippleOffsetX={rippleOffsetX}
          rippleOffsetY={rippleOffsetY}
          selection={selection}
          size={size}
        />
      </View>
      <Text style={styles.intensityHint}>
        <fbt desc="Explanation of how distance controls emotion intensity">The farther you move from the center, the more intense the feeling.</fbt>
      </Text>
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
  guide: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  readout: {
    pointerEvents: 'none',
    width: 260,
    marginBottom: 8,
  },
  readoutPrompt: {
    alignItems: 'center',
  },
  selectedReadout: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
  },
  revealLine: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: 260,
  },
  readoutEmotion: {
    color: palette.ink,
    fontFamily: type.medium,
    fontSize: textSize.emphasis,
    letterSpacing: 0.3,
    opacity: 0.82,
  },
  readoutEmotionSelected: {
    fontSize: textSize.section,
    letterSpacing: 0.7,
    opacity: 0.92,
  },
  readoutNuance: {
    color: palette.inkMuted,
    fontFamily: type.regular,
    fontSize: textSize.caption,
    letterSpacing: 0.8,
    marginTop: 7,
    textAlign: 'center',
  },
  readoutRelease: {
    color: palette.inkMuted,
    fontFamily: type.regular,
    fontSize: textSize.metadata,
    letterSpacing: 0.3,
    marginTop: 4,
    textAlign: 'center',
  },
  intensityHint: {
    color: palette.inkMuted,
    fontFamily: type.regular,
    fontSize: textSize.metadata,
    lineHeight: 18,
    maxWidth: 300,
    textAlign: 'center',
    marginTop: 4,
  },
});
