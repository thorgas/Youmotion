import { useSelector } from '@xstate/react';
import { fbs } from 'fbtee';
import { useRef } from 'react';
import assert from 'tiny-invariant';
import {
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  ONBOARDING_EVENTS,
  ONBOARDING_STATES,
} from '@/constants';
import type { EmotionSelection } from '@/features/check-in/domain/check-in';
import { EmotionStar } from '@/features/check-in/ui/emotion-star';
import { palette, surfaceColors, type } from '@/theme';
import { useAppNavigationActor } from '@/navigation/app-navigation.provider';
import { onboardingPulseResponsiveLayout } from './onboarding-pulse-responsive-layout';
import { OnboardingStepShell } from './onboarding-step-shell';

const _selectOnboardingSelection = (
  snapshot: ReturnType<ReturnType<typeof useAppNavigationActor>['getSnapshot']>,
) => snapshot.context.onboardingSelection;

const _samePreview = ({
  current,
  next,
}: {
  current: EmotionSelection | null;
  next: EmotionSelection | null;
}) => {
  assert(current === null || current.intensity >= 0 && current.intensity <= 1, 'Current onboarding selection must be normalized.');
  assert(next === null || next.intensity >= 0 && next.intensity <= 1, 'Next onboarding selection must be normalized.');
  if (!current || !next) return current === next;
  return current.emotionId === next.emotionId && current.level === next.level;
};

const _sameSelection = ({
  current,
  next,
}: {
  current: EmotionSelection | null;
  next: EmotionSelection | null;
}) => {
  assert(current === null || current.intensity >= 0 && current.intensity <= 1, 'Current full onboarding selection must be normalized.');
  assert(next === null || next.intensity >= 0 && next.intensity <= 1, 'Next full onboarding selection must be normalized.');
  if (!_samePreview({ current, next })) return false;
  if (!current || !next) return true;
  return current.intensity === next.intensity && current.color === next.color;
};

export function OnboardingPulseStep() {
  const actor = useAppNavigationActor();
  const selection = useSelector(actor, _selectOnboardingSelection);
  const window = useWindowDimensions();
  const responsive = onboardingPulseResponsiveLayout(window);
  assert(selection === null || selection.intensity >= 0 && selection.intensity <= 1, 'Onboarding selection must be normalized.');
  assert(responsive.starContentInset >= 0, 'Onboarding star inset must not be negative.');
  const latestSelection = useRef(selection);
  const publishedSelection = useRef(selection);
  const _back = () => actor.send({ type: ONBOARDING_EVENTS.BACK_REQUESTED });
  const _skip = () => actor.send({ type: ONBOARDING_EVENTS.SKIPPED });
  const _touchStarted = () => {
    latestSelection.current = selection;
    publishedSelection.current = selection;
    actor.send({ type: ONBOARDING_EVENTS.TOUCH_STARTED });
  };
  const _selectionChanged = (next: EmotionSelection | null) => {
    assert(next === null || next.intensity >= 0, 'Changed onboarding intensity must not be negative.');
    assert(next === null || next.intensity <= 1, 'Changed onboarding intensity must not exceed one.');
    latestSelection.current = next;
    if (_samePreview({ current: publishedSelection.current, next })) return;
    publishedSelection.current = next;
    actor.send({ type: ONBOARDING_EVENTS.SELECTION_CHANGED, selection: next });
  };
  const _selectionCancelled = () => {
    latestSelection.current = null;
    publishedSelection.current = null;
    actor.send({ type: ONBOARDING_EVENTS.SELECTION_CANCELLED });
  };
  const _selectionReleased = () => {
    if (!_sameSelection({
      current: publishedSelection.current,
      next: latestSelection.current,
    })) {
      publishedSelection.current = latestSelection.current;
      actor.send({
        type: ONBOARDING_EVENTS.SELECTION_CHANGED,
        selection: latestSelection.current,
      });
    }
    actor.send({ type: ONBOARDING_EVENTS.SELECTION_RELEASED });
  };
  const _showOrContinue = () => {
    actor.send({
      type: selection
        ? ONBOARDING_EVENTS.NEXT_REQUESTED
        : ONBOARDING_EVENTS.EXAMPLE_REQUESTED,
    });
  };

  return (
    <OnboardingStepShell
      onBack={_back}
      onPrimary={_showOrContinue}
      onSkip={_skip}
      primaryLabel={selection
        ? String(fbs('Continue', 'Button continuing after the onboarding Pulse example'))
        : String(fbs('Show the example', 'Button showing an accessible onboarding Pulse example'))}
      scrollEnabled={false}
      step={ONBOARDING_STATES.PULSE}
      stepLabel={String(fbs('02 · PULSE', 'Onboarding Pulse step label'))}>
      <View style={styles.heading}>
        <Text style={styles.title}>
          <fbt desc="Onboarding Pulse practice title">Try the Pulse.</fbt>
        </Text>
        <Text style={styles.body}>
          <fbt desc="Onboarding Pulse practice scenario">Imagine your chest tightens before a difficult meeting.</fbt>
        </Text>
      </View>
      <View
        style={[
          styles.starCard,
          responsive.compact && styles.starCardCompact,
        ]}>
        <EmotionStar
          contentInset={responsive.starContentInset}
          onCancel={_selectionCancelled}
          onRelease={_selectionReleased}
          onSelectionChange={_selectionChanged}
          onTouchStart={_touchStarted}
          selection={selection}
        />
      </View>
      <View
        style={[
          styles.explanation,
          responsive.compact && styles.explanationCompact,
        ]}>
        <Text style={styles.explanationTitle}>
          <fbt desc="Explanation of the feeling pulse dimensions">Direction names the emotion. Distance shows how strongly it is present.</fbt>
        </Text>
        <Text style={styles.explanationCopy}>
          <fbt desc="Explanation that the onboarding Pulse example is transient">This is a practice example. It is not saved to your history.</fbt>
        </Text>
      </View>
    </OnboardingStepShell>
  );
}

const styles = StyleSheet.create({
  heading: {
    alignItems: 'center',
  },
  title: {
    color: palette.ink,
    fontFamily: type.semibold,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.6,
    textAlign: 'center',
  },
  body: {
    color: palette.inkMuted,
    fontFamily: type.regular,
    fontSize: 15,
    lineHeight: 23,
    marginTop: 9,
    maxWidth: 360,
    textAlign: 'center',
  },
  starCard: {
    alignItems: 'center',
    marginHorizontal: -14,
    marginTop: 18,
  },
  starCardCompact: {
    marginTop: 8,
  },
  explanation: {
    backgroundColor: surfaceColors.subtle,
    borderCurve: 'continuous',
    borderRadius: 18,
    marginTop: 12,
    padding: 16,
  },
  explanationCompact: {
    marginTop: 8,
    padding: 12,
  },
  explanationTitle: {
    color: palette.ink,
    fontFamily: type.medium,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  explanationCopy: {
    color: palette.inkMuted,
    fontFamily: type.regular,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
    textAlign: 'center',
  },
});
