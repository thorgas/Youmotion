import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { fbs } from 'fbtee';
import { StyleSheet, Text, View } from 'react-native';
import assert from 'tiny-invariant';

import {
  ONBOARDING_EVENTS,
  ONBOARDING_STATES,
  ONBOARDING_STEP_COUNT,
} from '@/constants';
import { palette, type } from '@/theme';
import { useAppNavigationActor } from '@/navigation/app-navigation.provider';
import { OnboardingStepShell } from './onboarding-step-shell';

const privacySymbol: SymbolViewProps['name'] = {
  android: 'lock',
  ios: 'lock.fill',
  web: 'lock',
};

function JourneyRow({
  description,
  number,
  title,
}: {
  description: React.ReactNode;
  number: string;
  title: React.ReactNode;
}) {
  return (
    <View style={styles.journeyRow}>
      <View style={styles.number}>
        <Text style={styles.numberText}>{number}</Text>
      </View>
      <View style={styles.journeyCopy}>
        <Text style={styles.journeyTitle}>{title}</Text>
        <Text style={styles.journeyDescription}>{description}</Text>
      </View>
    </View>
  );
}

export function OnboardingWelcomeStep() {
  assert(ONBOARDING_STATES.WELCOME.length > 0, 'Welcome step identifier must not be empty.');
  assert(ONBOARDING_STEP_COUNT === 3, 'Welcome journey must match the onboarding step count.');
  const actor = useAppNavigationActor();
  const _continue = () => actor.send({ type: ONBOARDING_EVENTS.NEXT_REQUESTED });
  const _skip = () => actor.send({ type: ONBOARDING_EVENTS.SKIPPED });

  return (
    <OnboardingStepShell
      onPrimary={_continue}
      onSkip={_skip}
      primaryLabel={String(fbs(
        'See how it works',
        'Button continuing from the onboarding welcome step',
      ))}
      step={ONBOARDING_STATES.WELCOME}
      stepLabel={String(fbs('01 · BEGIN', 'Onboarding welcome step label'))}>
      <View style={styles.intro}>
        <Text style={styles.eyebrow}>
          <fbt desc="Onboarding welcome eyebrow">A QUIET CHECK-IN</fbt>
        </Text>
        <Text style={styles.title}>
          <fbt desc="Onboarding welcome title">Make space for what is here.</fbt>
        </Text>
        <Text style={styles.body}>
          <fbt desc="Onboarding welcome explanation">Feelings can be hard to name in the moment. Youmotion gives you a calm way to notice them without diagnosing or judging them.</fbt>
        </Text>
      </View>
      <View style={styles.journeyCard}>
        <JourneyRow
          description={<fbt desc="Description of the notice onboarding stage">Choose a feeling and its intensity.</fbt>}
          number="1"
          title={<fbt desc="Title of the notice onboarding stage">Notice</fbt>}
        />
        <View style={styles.divider} />
        <JourneyRow
          description={<fbt desc="Description of the reflect onboarding stage">Add a few words only if they help.</fbt>}
          number="2"
          title={<fbt desc="Title of the reflect onboarding stage">Reflect</fbt>}
        />
        <View style={styles.divider} />
        <JourneyRow
          description={<fbt desc="Description of the return onboarding stage">Revisit, edit, or delete the moment later.</fbt>}
          number="3"
          title={<fbt desc="Title of the return onboarding stage">Return</fbt>}
        />
      </View>
      <View style={styles.privacyCard}>
        <View style={styles.privacyIcon}>
          <SymbolView
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            name={privacySymbol}
            size={18}
            testID="onboarding-privacy-symbol"
            tintColor={palette.moss}
          />
        </View>
        <Text style={styles.privacyCopy}>
          <fbt desc="Onboarding privacy explanation">Your moments stay on this device. No account is needed.</fbt>
        </Text>
      </View>
    </OnboardingStepShell>
  );
}

const styles = StyleSheet.create({
  intro: {
    paddingTop: 16,
  },
  eyebrow: {
    color: palette.moss,
    fontFamily: type.semibold,
    fontSize: 11,
    letterSpacing: 1.4,
  },
  title: {
    color: palette.ink,
    fontFamily: type.semibold,
    fontSize: 40,
    lineHeight: 45,
    letterSpacing: -0.8,
    marginTop: 12,
    maxWidth: 410,
  },
  body: {
    color: palette.inkMuted,
    fontFamily: type.regular,
    fontSize: 16,
    lineHeight: 25,
    marginTop: 16,
    maxWidth: 440,
  },
  journeyCard: {
    backgroundColor: palette.paperRaised,
    borderColor: palette.hairline,
    borderCurve: 'continuous',
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 30,
    paddingHorizontal: 18,
  },
  journeyRow: {
    minHeight: 82,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    paddingVertical: 14,
  },
  number: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: palette.selectionWash,
  },
  numberText: {
    color: palette.moss,
    fontFamily: type.semibold,
    fontSize: 13,
  },
  journeyCopy: {
    flex: 1,
  },
  journeyTitle: {
    color: palette.ink,
    fontFamily: type.semibold,
    fontSize: 16,
  },
  journeyDescription: {
    color: palette.inkMuted,
    fontFamily: type.regular,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 3,
  },
  divider: {
    height: 1,
    backgroundColor: palette.hairline,
    marginLeft: 46,
  },
  privacyCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
    paddingHorizontal: 4,
  },
  privacyIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: palette.selectionWash,
  },
  privacyCopy: {
    flex: 1,
    color: palette.inkMuted,
    fontFamily: type.regular,
    fontSize: 13,
    lineHeight: 20,
  },
});
