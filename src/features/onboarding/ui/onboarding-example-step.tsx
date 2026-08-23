import { fbs } from 'fbtee';
import { StyleSheet, Text, View } from 'react-native';

import {
  ONBOARDING_EVENTS,
  ONBOARDING_STATES,
} from '@/constants';
import { emotionName, emotionNuance } from '@/features/check-in/ui/emotion-copy';
import { palette, type } from '@/theme';
import { useAppNavigationActor } from '@/navigation/app-navigation.provider';
import { onboardingExampleSelection } from '../domain/onboarding';
import { OnboardingStepShell } from './onboarding-step-shell';

export function OnboardingExampleStep() {
  const actor = useAppNavigationActor();
  const selection = onboardingExampleSelection;
  const _back = () => actor.send({ type: ONBOARDING_EVENTS.BACK_REQUESTED });
  const _finish = () => actor.send({ type: ONBOARDING_EVENTS.FINISHED });
  const _skip = () => actor.send({ type: ONBOARDING_EVENTS.SKIPPED });

  return (
    <OnboardingStepShell
      onBack={_back}
      onPrimary={_finish}
      onSkip={_skip}
      primaryLabel={String(fbs(
        'Try your first check-in',
        'Button completing onboarding and opening the real Pulse',
      ))}
      step={ONBOARDING_STATES.EXAMPLE}
      stepLabel={String(fbs('03 · REFLECT', 'Onboarding reflection step label'))}>
      <View style={styles.heading}>
        <Text style={styles.title}>
          <fbt desc="Onboarding reflection example title">A few words can hold the moment.</fbt>
        </Text>
        <Text style={styles.body}>
          <fbt desc="Onboarding reflection optionality explanation">After the Pulse, reflection is brief. Going deeper is always optional.</fbt>
        </Text>
      </View>
      <View style={styles.reflectionCard}>
        <View style={styles.emotionRow}>
          <View style={[styles.emotionDot, { backgroundColor: selection.color }]} />
          <Text style={styles.emotionLabel}>
            {emotionNuance(selection)} · {emotionName(selection.emotionId)}
          </Text>
        </View>
        <Text style={styles.reflection}>
          <fbt desc="Onboarding meeting reflection example">“My chest tightened before the meeting.”</fbt>
        </Text>
        <View style={styles.divider} />
        <Text style={styles.caption}>
          <fbt desc="Explanation of when the basic reflection is saved">The feeling and note are saved before any optional belief work.</fbt>
        </Text>
      </View>
      <View style={styles.beliefCard}>
        <Text style={styles.cardEyebrow}>
          <fbt desc="Optional belief-work onboarding label">IF IT HELPS, GO DEEPER</fbt>
        </Text>
        <Text style={styles.beliefLabel}>
          <fbt desc="Core belief example label explaining its restrictive role">
            Core belief · what limits you
          </fbt>
        </Text>
        <Text style={styles.belief}>
          <fbt desc="Core belief onboarding example">“I must always perform.”</fbt>
        </Text>
        <View style={styles.beliefDivider} />
        <Text style={styles.beliefLabel}>
          <fbt desc="Guiding belief example label explaining its supportive role">
            Guiding belief · what supports you
          </fbt>
        </Text>
        <Text style={styles.belief}>
          <fbt desc="Guiding belief onboarding example">“I can prepare and still be imperfect.”</fbt>
        </Text>
      </View>
      <Text style={styles.historyCopy}>
        <fbt desc="Onboarding History explanation">Saved moments appear in History and can be edited or deleted. They stay on this device.</fbt>
      </Text>
    </OnboardingStepShell>
  );
}

const styles = StyleSheet.create({
  heading: {
    paddingTop: 4,
  },
  title: {
    color: palette.ink,
    fontFamily: type.semibold,
    fontSize: 35,
    lineHeight: 41,
    letterSpacing: -0.7,
    maxWidth: 430,
  },
  body: {
    color: palette.inkMuted,
    fontFamily: type.regular,
    fontSize: 15,
    lineHeight: 23,
    marginTop: 12,
    maxWidth: 430,
  },
  reflectionCard: {
    backgroundColor: palette.paperRaised,
    borderColor: palette.hairline,
    borderCurve: 'continuous',
    borderRadius: 22,
    borderWidth: 1,
    marginTop: 26,
    padding: 18,
  },
  emotionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  emotionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  emotionLabel: {
    color: palette.ink,
    fontFamily: type.semibold,
    fontSize: 14,
  },
  reflection: {
    color: palette.ink,
    fontFamily: type.medium,
    fontSize: 19,
    lineHeight: 27,
    marginTop: 18,
  },
  divider: {
    height: 1,
    backgroundColor: palette.hairline,
    marginVertical: 16,
  },
  caption: {
    color: palette.inkMuted,
    fontFamily: type.regular,
    fontSize: 12,
    lineHeight: 18,
  },
  beliefCard: {
    backgroundColor: '#F2EFEA',
    borderCurve: 'continuous',
    borderRadius: 22,
    marginTop: 14,
    padding: 18,
  },
  cardEyebrow: {
    color: palette.moss,
    fontFamily: type.semibold,
    fontSize: 10,
    letterSpacing: 1.2,
    marginBottom: 16,
  },
  beliefLabel: {
    color: palette.inkMuted,
    fontFamily: type.regular,
    fontSize: 12,
  },
  belief: {
    color: palette.ink,
    fontFamily: type.medium,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 4,
  },
  beliefDivider: {
    height: 1,
    backgroundColor: palette.hairline,
    marginVertical: 14,
  },
  historyCopy: {
    color: palette.inkMuted,
    fontFamily: type.regular,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 16,
    paddingHorizontal: 4,
    textAlign: 'center',
  },
});
