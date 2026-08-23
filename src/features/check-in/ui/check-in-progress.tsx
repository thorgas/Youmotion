import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

import { MOTION_DURATION } from '@/constants';
import { palette, type } from '@/theme';

type ProgressStep = 1 | 2 | 3;
type ProgressStatus = 'active' | 'complete' | 'upcoming';
type ProgressHeaderContext = 'reflection' | 'editing' | 'core-belief' | 'guiding-belief';

const progressAnimation = {
  duration: MOTION_DURATION.STATE,
  reduceMotion: ReduceMotion.System,
};

function ProgressEyebrow({ context }: { context: ProgressHeaderContext }) {
  if (context === 'editing') {
    return (
      <Text style={styles.eyebrow}>
        <fbt desc="Label for editing an existing check-in">EDIT MOMENT</fbt>
      </Text>
    );
  }
  if (context === 'core-belief') {
    return (
      <Text style={styles.eyebrow}>
        <fbt desc="Optional core belief step label">UNDERSTAND · OPTIONAL</fbt>
      </Text>
    );
  }
  if (context === 'guiding-belief') {
    return (
      <Text style={styles.eyebrow}>
        <fbt desc="Dedicated positive guiding belief step label">
          NEW DIRECTION · OPTIONAL
        </fbt>
      </Text>
    );
  }
  return (
    <Text style={styles.eyebrow}>
      <fbt desc="Second step label for reflecting on a feeling">REFLECT</fbt>
    </Text>
  );
}

export function CheckInProgressHeader({
  activeStep,
  compact = false,
  context,
}: {
  activeStep: ProgressStep;
  compact?: boolean;
  context: ProgressHeaderContext;
}) {
  return (
    <View
      style={[styles.header, compact ? styles.headerCompact : null]}
      testID="check-in-progress-header"
    >
      <View style={styles.headerMeta}>
        <ProgressEyebrow context={context} />
        <Text style={styles.progressCount}>{activeStep} / 3</Text>
      </View>
      <CheckInProgress activeStep={activeStep} compact={compact} />
    </View>
  );
}

function progressStatus({
  activeStep,
  step,
}: {
  activeStep: ProgressStep;
  step: ProgressStep;
}): ProgressStatus {
  if (step === activeStep) return 'active';
  if (step < activeStep) return 'complete';
  return 'upcoming';
}

function Step({
  activeStep,
  step,
}: {
  activeStep: ProgressStep;
  step: ProgressStep;
}) {
  const status = progressStatus({ activeStep, step });
  const segmentStyle = useAnimatedStyle(() => ({
    backgroundColor: withTiming(
      status === 'active'
        ? palette.ink
        : status === 'complete'
          ? palette.moss
          : 'rgba(42, 39, 34, 0.10)',
      progressAnimation,
    ),
  }), [status]);

  return (
    <Animated.View
      accessibilityState={{ selected: status === 'active' }}
      style={[styles.segment, segmentStyle]}
      testID={`check-in-progress-step-${step}-${status}`}
    />
  );
}

export function CheckInProgress({
  activeStep,
  compact = false,
}: {
  activeStep: ProgressStep;
  compact?: boolean;
}) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: 3, now: activeStep }}
      style={[styles.container, compact ? styles.containerCompact : null]}
      testID="check-in-progress"
    >
      <View style={styles.track}>
        <Step activeStep={activeStep} step={1} />
        <Step activeStep={activeStep} step={2} />
        <Step activeStep={activeStep} step={3} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignSelf: 'center',
    backgroundColor: palette.paper,
    marginTop: 24,
    maxWidth: 520,
    paddingHorizontal: 22,
    width: '100%',
  },
  headerCompact: { marginTop: 8 },
  headerMeta: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  eyebrow: {
    color: palette.inkMuted,
    fontFamily: type.semibold,
    fontSize: 11,
    letterSpacing: 1.4,
  },
  progressCount: {
    color: palette.inkMuted,
    fontFamily: type.medium,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  container: { marginBottom: 6, marginTop: 12 },
  containerCompact: { marginBottom: 0, marginTop: 8 },
  track: { flexDirection: 'row', gap: 6 },
  segment: { borderRadius: 3, flex: 1, height: 4 },
});
