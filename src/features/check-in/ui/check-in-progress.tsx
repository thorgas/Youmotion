import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { palette, type } from './theme';

type ProgressStep = 1 | 2 | 3;
type ProgressStatus = 'active' | 'complete' | 'upcoming';

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
  label,
  optional,
  step,
}: {
  activeStep: ProgressStep;
  label: ReactNode;
  optional: boolean;
  step: ProgressStep;
}) {
  const status = progressStatus({ activeStep, step });
  const emphasized = status !== 'upcoming';

  return (
    <View
      accessibilityState={{ selected: status === 'active' }}
      style={styles.step}
      testID={`check-in-progress-step-${step}-${status}`}
    >
      <View style={[
        styles.marker,
        status === 'active' ? styles.markerActive : null,
        status === 'complete' ? styles.markerComplete : null,
      ]}>
        <Text style={[
          styles.markerText,
          emphasized ? styles.markerTextEmphasized : null,
        ]}>
          {status === 'complete' ? '✓' : step}
        </Text>
      </View>
      <Text style={[
        styles.label,
        emphasized ? styles.labelEmphasized : null,
      ]}>
        {label}
      </Text>
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
  return (
    <View style={[
      styles.connector,
      activeStep > afterStep ? styles.connectorComplete : null,
    ]} />
  );
}

export function CheckInProgress({ activeStep }: { activeStep: ProgressStep }) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: 3, now: activeStep }}
      style={styles.container}
      testID="check-in-progress"
    >
      <View style={styles.track}>
        <Step
          activeStep={activeStep}
          label={<fbt desc="Moment step in check-in progress">Moment</fbt>}
          optional={false}
          step={1}
        />
        <Connector activeStep={activeStep} afterStep={1} />
        <Step
          activeStep={activeStep}
          label={<fbt desc="Harmful core belief step in check-in progress">Core belief</fbt>}
          optional
          step={2}
        />
        <Connector activeStep={activeStep} afterStep={2} />
        <Step
          activeStep={activeStep}
          label={<fbt desc="Positive guiding belief step in check-in progress">Guiding belief</fbt>}
          optional
          step={3}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
    marginTop: 16,
  },
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
  markerActive: {
    backgroundColor: palette.ink,
    borderColor: palette.ink,
  },
  markerComplete: {
    backgroundColor: palette.moss,
    borderColor: palette.moss,
  },
  markerText: {
    color: palette.inkMuted,
    fontFamily: type.semibold,
    fontSize: 10,
  },
  markerTextEmphasized: {
    color: palette.paperRaised,
  },
  label: {
    color: palette.inkMuted,
    fontFamily: type.medium,
    fontSize: 10,
    marginTop: 6,
    textAlign: 'center',
  },
  labelEmphasized: {
    color: palette.ink,
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
  },
  connectorComplete: {
    backgroundColor: palette.moss,
  },
});
