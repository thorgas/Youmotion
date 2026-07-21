import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

import { MOTION_DURATION } from '@/constants';
import { palette, type } from './theme';

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
        <fbt desc="Optional core belief step label">03 · CORE BELIEF</fbt>
      </Text>
    );
  }
  if (context === 'guiding-belief') {
    return (
      <Text style={styles.eyebrow}>
        <fbt desc="Dedicated positive guiding belief step label">
          04 · NEW DIRECTION
        </fbt>
      </Text>
    );
  }
  return (
    <Text style={styles.eyebrow}>
      <fbt desc="Second step label for reflecting on a feeling">02 · REFLECT</fbt>
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
      <ProgressEyebrow context={context} />
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
  optional,
  step,
}: {
  activeStep: ProgressStep;
  optional: boolean;
  step: ProgressStep;
}) {
  const status = progressStatus({ activeStep, step });
  const emphasized = status !== 'upcoming';
  const markerStyle = useAnimatedStyle(() => ({
    backgroundColor: withTiming(
      status === 'active'
        ? palette.ink
        : status === 'complete'
          ? palette.moss
          : palette.paperRaised,
      progressAnimation,
    ),
    borderColor: withTiming(
      status === 'active'
        ? palette.ink
        : status === 'complete'
          ? palette.moss
          : palette.hairline,
      progressAnimation,
    ),
    transform: [{
      scale: withTiming(status === 'active' ? 1.06 : 1, progressAnimation),
    }],
  }), [status]);
  const markerTextStyle = useAnimatedStyle(() => ({
    color: withTiming(
      emphasized ? palette.paperRaised : palette.inkMuted,
      progressAnimation,
    ),
  }), [emphasized]);
  const labelStyle = useAnimatedStyle(() => ({
    color: withTiming(
      emphasized ? palette.ink : palette.inkMuted,
      progressAnimation,
    ),
  }), [emphasized]);

  return (
    <View
      accessibilityState={{ selected: status === 'active' }}
      style={styles.step}
      testID={`check-in-progress-step-${step}-${status}`}
    >
      <Animated.View style={[styles.marker, markerStyle]}>
        <Animated.Text style={[styles.markerText, markerTextStyle]}>
          {status === 'complete' ? '✓' : step}
        </Animated.Text>
      </Animated.View>
      <Animated.Text style={[styles.label, labelStyle]}>
        {step === 1
          ? <fbt desc="Moment step in check-in progress">Moment</fbt>
          : null}
        {step === 2
          ? <fbt desc="Harmful core belief step in check-in progress">Core belief</fbt>
          : null}
        {step === 3
          ? <fbt desc="Positive guiding belief step in check-in progress">Guiding belief</fbt>
          : null}
      </Animated.Text>
      {optional ? (
        <Text
          style={styles.optional}
          testID={`check-in-progress-step-${step}-optional`}
        >
          <fbt desc="Label below an optional check-in progress step">Optional</fbt>
        </Text>
      ) : <View style={styles.optionalSpacer} />}
    </View>
  );
}

function Connector({
  activeStep,
  afterStep,
}: {
  activeStep: ProgressStep;
  afterStep: 1 | 2;
}) {
  const complete = activeStep > afterStep;
  const fillStyle = useAnimatedStyle(() => ({
    opacity: withTiming(complete ? 1 : 0, progressAnimation),
    transform: [{
      scaleX: withTiming(complete ? 1 : 0.6, progressAnimation),
    }],
  }), [complete]);

  return (
    <View style={styles.connector}>
      <Animated.View style={[styles.connectorFill, fillStyle]} />
    </View>
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
        <Step
          activeStep={activeStep}
          optional={false}
          step={1}
        />
        <Connector activeStep={activeStep} afterStep={1} />
        <Step
          activeStep={activeStep}
          optional
          step={2}
        />
        <Connector activeStep={activeStep} afterStep={2} />
        <Step
          activeStep={activeStep}
          optional
          step={3}
        />
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
  eyebrow: {
    color: palette.inkMuted,
    fontFamily: type.semibold,
    fontSize: 11,
    letterSpacing: 1.4,
  },
  container: {
    marginBottom: 8,
    marginTop: 16,
  },
  containerCompact: { marginBottom: 0, marginTop: 8 },
  track: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  step: {
    alignItems: 'center',
    flex: 1,
  },
  marker: {
    alignItems: 'center',
    backgroundColor: palette.paperRaised,
    borderColor: palette.hairline,
    borderRadius: 12,
    borderWidth: 1,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  markerText: {
    color: palette.inkMuted,
    fontFamily: type.semibold,
    fontSize: 10,
  },
  label: {
    color: palette.inkMuted,
    fontFamily: type.medium,
    fontSize: 10,
    marginTop: 6,
    textAlign: 'center',
  },
  optional: {
    color: palette.inkMuted,
    fontFamily: type.regular,
    fontSize: 8,
    letterSpacing: 0.4,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  optionalSpacer: {
    height: 12,
  },
  connector: {
    backgroundColor: palette.hairline,
    flex: 0.48,
    height: 1,
    marginTop: 12,
    overflow: 'hidden',
  },
  connectorFill: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: palette.moss,
    transformOrigin: 'left',
  },
});
