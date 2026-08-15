import { PressableScale } from 'pressto';
import { fbs } from 'fbtee';
import type { PropsWithChildren } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackButton } from '@/components/ui/app-back-button';
import {
  ONBOARDING_STATES,
  ONBOARDING_STEP_COUNT,
  MOTION_DURATION,
} from '@/constants';
import { onboardingStepNumber } from '../application/onboarding-progress';
import { actionColors, palette, type } from '@/features/check-in/ui/theme';

type OnboardingStep = typeof ONBOARDING_STATES[keyof typeof ONBOARDING_STATES];

type OnboardingStepShellProps = PropsWithChildren<{
  backLabel?: string;
  onBack?: () => void;
  onPrimary: () => void;
  onSkip: () => void;
  primaryDisabled?: boolean;
  primaryLabel: string;
  scrollEnabled?: boolean;
  step: OnboardingStep;
  stepLabel: string;
}>;

const progressSteps = Object.freeze([1, 2, 3]);
const progressAnimation = {
  duration: MOTION_DURATION.STATE,
  reduceMotion: ReduceMotion.System,
};

function ProgressTrack({ active }: { active: boolean }) {
  const fillStyle = useAnimatedStyle(() => ({
    opacity: withTiming(active ? 1 : 0, progressAnimation),
    transform: [{
      scaleX: withTiming(active ? 1 : 0.6, progressAnimation),
    }],
  }), [active]);

  return (
    <View style={styles.progressTrack}>
      <Animated.View style={[styles.progressTrackFill, fillStyle]} />
    </View>
  );
}

export function OnboardingStepShell({
  backLabel,
  children,
  onBack,
  onPrimary,
  onSkip,
  primaryDisabled = false,
  primaryLabel,
  scrollEnabled = true,
  step,
  stepLabel,
}: OnboardingStepShellProps) {
  const stepNumber = onboardingStepNumber(step);
  const progressLabel = String(fbs(
    'Step '
      + fbs.param('currentStep', String(stepNumber))
      + ' of '
      + fbs.param('stepCount', String(ONBOARDING_STEP_COUNT)),
    'Accessibility label for onboarding progress',
  ));

  return (
    <View style={styles.page} testID={`onboarding-${step}-step`}>
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.topBar}>
          {onBack && backLabel ? (
            <AppBackButton
              accessibilityLabel={backLabel}
              label={backLabel}
              onPress={onBack}
              style={styles.quietAction}
              testID="onboarding-back"
            />
          ) : <View style={styles.quietActionPlaceholder} />}
          <Text style={styles.stepLabel}>{stepLabel}</Text>
          <PressableScale
            accessibilityRole="button"
            onPress={onSkip}
            style={styles.quietAction}
            testID="onboarding-skip">
            <Text style={styles.quietActionText}>
              <fbt desc="Button that skips the explanation onboarding">Skip</fbt>
            </Text>
          </PressableScale>
        </View>
        <View
          accessibilityLabel={progressLabel}
          accessibilityRole="progressbar"
          accessibilityValue={{
            min: 1,
            max: ONBOARDING_STEP_COUNT,
            now: stepNumber,
            text: progressLabel,
          }}
          style={styles.progress}
          testID="onboarding-progress">
          {progressSteps.map((candidate) => (
            <ProgressTrack
              active={candidate <= stepNumber}
              key={candidate}
            />
          ))}
        </View>
        <ScrollView
          bounces={scrollEnabled}
          contentContainerStyle={styles.content}
          contentInsetAdjustmentBehavior="automatic"
          scrollEnabled={scrollEnabled}
          showsVerticalScrollIndicator={false}
          testID="onboarding-content-scroll">
          {children}
        </ScrollView>
        <View style={styles.footer}>
          <PressableScale
            accessibilityRole="button"
            accessibilityState={{ disabled: primaryDisabled }}
            disabled={primaryDisabled}
            onPress={onPrimary}
            style={[
              styles.primaryButton,
              primaryDisabled && styles.primaryButtonDisabled,
            ]}
            testID="onboarding-primary-action">
            <Text style={styles.primaryButtonText}>{primaryLabel}</Text>
          </PressableScale>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: palette.paper,
  },
  safeArea: {
    flex: 1,
  },
  topBar: {
    width: '100%',
    maxWidth: 520,
    minHeight: 48,
    alignSelf: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  quietAction: {
    minWidth: 64,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderCurve: 'continuous',
  },
  quietActionPlaceholder: {
    width: 64,
    height: 44,
  },
  quietActionText: {
    color: palette.inkMuted,
    fontFamily: type.semibold,
    fontSize: 14,
  },
  stepLabel: {
    color: palette.inkMuted,
    fontFamily: type.semibold,
    fontSize: 10,
    letterSpacing: 1.3,
  },
  progress: {
    width: '100%',
    maxWidth: 488,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  progressTrack: {
    height: 3,
    flex: 1,
    borderRadius: 2,
    backgroundColor: palette.hairline,
    overflow: 'hidden',
  },
  progressTrackFill: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: palette.moss,
    transformOrigin: 'left',
  },
  content: {
    width: '100%',
    maxWidth: 520,
    flexGrow: 1,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 20,
  },
  footer: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 8,
  },
  primaryButton: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    borderCurve: 'continuous',
    backgroundColor: actionColors.primaryBackground,
    paddingHorizontal: 20,
  },
  primaryButtonDisabled: {
    opacity: 0.42,
  },
  primaryButtonText: {
    color: actionColors.primaryForeground,
    fontFamily: type.semibold,
    fontSize: 16,
  },
});
