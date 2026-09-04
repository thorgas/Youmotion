import { useSelector } from '@xstate/store-react';
import assert from '@/assert';
import { fbs } from 'fbtee';
import { PanResponder, StyleSheet, Text, useWindowDimensions, View, type AccessibilityActionEvent, type AccessibilityActionInfo, type StyleProp, type TextStyle } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { EMOTION_STAR_ACCESSIBILITY_ACTIONS, MOTION_DURATION } from '@/constants';
import { appSettingsStore } from '@/app-stores';
import type { EmotionLabelMode } from '@/preferences/emotion-label-mode';
import type { EmotionSelection } from '../domain/check-in';
import {
  emotionAngle,
  emotionSelectionWithAdjacentEmotion,
  emotionSelectionWithAdjustedIntensity,
  pointConstrainedToRadius,
  selectionFromPoint,
} from '../domain/emotion-selection';
import { emotions } from '../domain/emotion';
import {
  BaseStateRipples,
  CenteredBaseStateRipples,
} from './base-state-ripples';
import { EmotionAxisLabel } from './emotion-axis-label';
import { emotionName, emotionNuance, emotionStarAccessibility, emotionStarAccessibilityHint, emotionStarAccessibilityLabel } from './emotion-copy';
import { palette, textSize, type } from '@/theme';

type EmotionStarProps = {
  selection: EmotionSelection | null;
  centerOrigin?: boolean;
  contentInset?: number;
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

const readoutEntering = FadeIn
  .duration(MOTION_DURATION.MICRO)
  .reduceMotion(ReduceMotion.System);
const readoutExiting = FadeOut
  .duration(MOTION_DURATION.MICRO)
  .reduceMotion(ReduceMotion.System);
const stateAnimation = {
  duration: MOTION_DURATION.STATE,
  reduceMotion: ReduceMotion.System,
};

const _accessibilityActions = (): readonly AccessibilityActionInfo[] => [
  {
    name: EMOTION_STAR_ACCESSIBILITY_ACTIONS.MORE_INTENSE,
    label: String(fbs('More intense', 'Feeling Pulse accessibility action increasing intensity')),
  },
  {
    name: EMOTION_STAR_ACCESSIBILITY_ACTIONS.LESS_INTENSE,
    label: String(fbs('Less intense', 'Feeling Pulse accessibility action decreasing intensity')),
  },
  {
    name: EMOTION_STAR_ACCESSIBILITY_ACTIONS.NEXT_EMOTION,
    label: String(fbs('Next feeling', 'Feeling Pulse accessibility action selecting the next emotion')),
  },
  {
    name: EMOTION_STAR_ACCESSIBILITY_ACTIONS.PREVIOUS_EMOTION,
    label: String(fbs('Previous feeling', 'Feeling Pulse accessibility action selecting the previous emotion')),
  },
  {
    name: EMOTION_STAR_ACCESSIBILITY_ACTIONS.CONFIRM,
    label: String(fbs('Confirm feeling', 'Feeling Pulse accessibility action confirming the selected emotion')),
  },
];

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
        style={styles.selectedNuance}
        testID="emotion-nuance-reveal"
        text={emotionNuance(selection)}
      />
      <ReadoutText
        style={styles.selectedEmotionName}
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
}: EmotionFieldProps) {
  return (
    <>
      {centerOrigin
        ? <CenteredBaseStateRipples />
        : <BaseStateRipples offsetX={rippleOffsetX} offsetY={rippleOffsetY} />}
      {emotions.map((emotion, index) => {
        assert(emotion.nuanceCount > 0, 'Rendered emotions require nuances.');
        assert(index >= 0 && index < emotions.length, 'Rendered emotion index must be in range.');
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
  contentInset = 0,
  selection,
  disabled,
  onTouchStart,
  onSelectionChange,
  onCancel,
  onRelease,
}: EmotionStarProps) {
  const labelMode = useSelector(appSettingsStore, _selectEmotionLabelMode);
  const { width } = useWindowDimensions();
  const size = Math.min(width - 32 - contentInset, 390);
  const center = size / 2;
  const radius = size * 0.45;
  assert(size > 0, 'Emotion star must have a positive size.');
  assert(selection === null || selection.intensity >= 0 && selection.intensity <= 1, 'Emotion star selection intensity must be normalized.');
  const rippleOffsetX = useSharedValue(0);
  const rippleOffsetY = useSharedValue(0);
  const promptStyle = useAnimatedStyle(() => ({
    opacity: withTiming(selection ? 0 : 1, stateAnimation),
  }), [selection]);

  const _updateSelection = ({ x, y }: { x: number; y: number }) => {
    assert(Number.isFinite(x) && Number.isFinite(y), 'Touch coordinates must be finite.');
    assert(radius > 0, 'Touch selection requires a positive radius.');
    const maxRadius = radius * 0.8;
    const point = pointConstrainedToRadius({
      point: { x, y },
      center: { x: center, y: center },
      maxRadius,
    });
    rippleOffsetX.set(point.x - center);
    rippleOffsetY.set(point.y - center);
    onSelectionChange(selectionFromPoint({
      point,
      center: { x: center, y: center },
      maxRadius,
    }));
  };

  const responder = PanResponder.create({
    onStartShouldSetPanResponder: () => !disabled,
    onMoveShouldSetPanResponder: () => !disabled,
    onPanResponderGrant: (event) => {
      onTouchStart();
      _updateSelection({ x: event.nativeEvent.locationX, y: event.nativeEvent.locationY });
    },
    onPanResponderMove: (event) => _updateSelection({
      x: event.nativeEvent.locationX,
      y: event.nativeEvent.locationY,
    }),
    onPanResponderTerminationRequest: () => false,
    onPanResponderRelease: onRelease,
    onPanResponderTerminate: onCancel,
  });
  const _accessibilityAction = (event: AccessibilityActionEvent) => {
    assert(event.nativeEvent.actionName.length > 0, 'Accessibility actions require a name.');
    assert(selection === null || selection.intensity >= 0 && selection.intensity <= 1, 'Accessible selection intensity must be normalized.');
    if (disabled) return;
    const { actionName } = event.nativeEvent;
    if (actionName === EMOTION_STAR_ACCESSIBILITY_ACTIONS.CONFIRM) {
      if (selection) onRelease();
      return;
    }
    const nextSelection = actionName === EMOTION_STAR_ACCESSIBILITY_ACTIONS.MORE_INTENSE
      ? emotionSelectionWithAdjustedIntensity({ direction: 1, selection })
      : actionName === EMOTION_STAR_ACCESSIBILITY_ACTIONS.LESS_INTENSE
        ? emotionSelectionWithAdjustedIntensity({ direction: -1, selection })
        : actionName === EMOTION_STAR_ACCESSIBILITY_ACTIONS.NEXT_EMOTION
          ? emotionSelectionWithAdjacentEmotion({ direction: 1, selection })
          : actionName === EMOTION_STAR_ACCESSIBILITY_ACTIONS.PREVIOUS_EMOTION
            ? emotionSelectionWithAdjacentEmotion({ direction: -1, selection })
            : null;
    if (!nextSelection) return;
    onTouchStart();
    onSelectionChange(nextSelection);
  };

  return (
    <View style={styles.frame} testID="emotion-star-frame">
      <View style={styles.readout} testID="emotion-readout">
        <Animated.View
          accessibilityElementsHidden={selection !== null}
          importantForAccessibility={selection ? 'no-hide-descendants' : 'auto'}
          style={[styles.readoutPrompt, promptStyle]}
          testID="emotion-readout-prompt">
          <Text style={styles.promptLead}>
            <fbt desc="Primary instruction above the feeling pulse">
              Touch the point, then move.
            </fbt>
          </Text>
          <Text style={styles.promptSupport}>
            <fbt desc="Supporting instruction explaining the Feeling Pulse direction and distance controls">
              Direction chooses the feeling. Distance chooses its intensity.
            </fbt>
          </Text>
        </Animated.View>
        {selection ? <EmotionReadout selection={selection} /> : null}
      </View>
      <View
        accessibilityActions={_accessibilityActions()}
        accessibilityHint={emotionStarAccessibilityHint()}
        accessibilityLabel={emotionStarAccessibilityLabel()}
        accessibilityRole="adjustable"
        accessibilityState={{ disabled }}
        accessibilityValue={{ text: emotionStarAccessibility(selection) }}
        onAccessibilityAction={_accessibilityAction}
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
  readout: {
    pointerEvents: 'none',
    maxWidth: 300,
    width: '100%',
    marginBottom: -16,
  },
  readoutPrompt: {
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  selectedReadout: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  revealLine: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  promptLead: {
    color: palette.ink,
    fontFamily: type.medium,
    fontSize: textSize.emphasis,
    letterSpacing: 0.3,
    lineHeight: 20,
    opacity: 0.82,
    textAlign: 'center',
  },
  promptSupport: {
    color: palette.inkMuted,
    fontFamily: type.regular,
    fontSize: textSize.metadata,
    letterSpacing: 0.3,
    lineHeight: 18,
    marginTop: 4,
    textAlign: 'center',
  },
  selectedNuance: {
    color: palette.ink,
    fontFamily: type.medium,
    fontSize: textSize.section,
    letterSpacing: 0.7,
    opacity: 0.92,
  },
  selectedEmotionName: {
    color: palette.inkMuted,
    fontFamily: type.regular,
    fontSize: textSize.caption,
    letterSpacing: 0.8,
    marginTop: 7,
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
