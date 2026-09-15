import { useSelector } from '@xstate/react';
import * as Schema from 'effect/Schema';
import { PressableScale } from 'pressto';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeInDown,
  ReduceMotion,
  ZoomIn,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import assert from '@/assert';

import {
  CHECK_IN_EVENTS,
  MOTION_DURATION,
  MOTION_OFFSET,
  REMINDER_EVENTS,
  REMINDER_TARGET_KINDS,
} from '@/constants';
import { CheckInSchema } from '@/features/check-in/domain/check-in';
import { PersistentScrollView } from '@/components/ui/persistent-scroll-view';
import { useAppNavigationActor } from '@/navigation/app-navigation.provider';
import { savedCheckInCopy } from './emotion-copy';
import { guidingBeliefSystemText } from '@/features/beliefs/ui/belief-system-copy';
import { actionColors, palette, type } from '@/theme';

const _selectContext = (
  snapshot: ReturnType<ReturnType<typeof useAppNavigationActor>['getSnapshot']>,
) => snapshot.context;

const haloEntering = ZoomIn
  .duration(MOTION_DURATION.ENTER)
  .reduceMotion(ReduceMotion.System)
  .withInitialValues({
    transform: [{ scale: 0.94 }],
  });
const revealAfter = (delay: number) => FadeInDown
  .delay(delay)
  .duration(MOTION_DURATION.ENTER)
  .reduceMotion(ReduceMotion.System)
  .withInitialValues({
    opacity: 0,
    transform: [{ translateY: MOTION_OFFSET.ENTER }],
  });
const titleEntering = revealAfter(50);
const copyEntering = revealAfter(90);
const guidingCardEntering = revealAfter(130);
const reminderOfferEntering = revealAfter(170);
const buttonEntering = revealAfter(210);

export function SuccessScreen() {
  const actor = useAppNavigationActor();
  const context = useSelector(actor, _selectContext);
  const saved = context.saved;
  assert(Schema.is(Schema.NullOr(CheckInSchema))(saved), 'Saved check-in must satisfy its domain schema.');
  assert(context.beliefStatements.every(({ beliefSystemId }) => beliefSystemId.length > 0), 'Saved check-in beliefs require identifiers.');
  const guidingStatement = saved?.beliefSystemId
    ? guidingBeliefSystemText({
        id: saved.beliefSystemId,
        statements: context.beliefStatements,
      })
    : undefined;
  const reminderOfferAvailable = context.reminderDataHydrated
    && context.reminderError === null
    && saved?.beliefSystemId !== undefined
    && guidingStatement !== undefined
    && !context.reminderAssignments.some((assignment) => (
      assignment.targetKind === REMINDER_TARGET_KINDS.GUIDING_BELIEF
      && assignment.beliefSystemId === saved.beliefSystemId
    ));
  const _openReminderSetup = () => actor.send({
    type: REMINDER_EVENTS.SUCCESS_OFFER_ACCEPTED,
  });
  const _finish = () => actor.send({ type: CHECK_IN_EVENTS.RESTARTED });

  if (!saved) return null;

  return (
    <View style={styles.page} testID="success-screen">
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <PersistentScrollView contentContainerStyle={styles.content}>
        <Animated.View entering={haloEntering} style={styles.halo}>
          <Text style={styles.check}>✓</Text>
        </Animated.View>
        <Animated.Text entering={titleEntering} style={styles.title}>
          <fbt desc="Successful check-in title">You arrived with yourself.</fbt>
        </Animated.Text>
        <Animated.Text entering={copyEntering} style={styles.copy}>
          {savedCheckInCopy(saved)}
        </Animated.Text>
        {guidingStatement ? (
          <Animated.View
            entering={guidingCardEntering}
            style={styles.guidingCard}
            testID="success-guiding-belief">
            <Text style={styles.guidingLabel}>
              <fbt desc="Label above the positive guiding belief on the completed check-in screen">
                Your guiding belief
              </fbt>
            </Text>
            <Text style={styles.guidingText}>{guidingStatement}</Text>
          </Animated.View>
        ) : null}
        {reminderOfferAvailable ? (
          <Animated.View
            entering={reminderOfferEntering}
            style={styles.reminderOffer}
            testID="success-reminder-offer">
            <Text style={styles.reminderEyebrow}>
              <fbt desc="Completed check-in optional Leitsatz reminder eyebrow">
                GENTLE REMINDER
              </fbt>
            </Text>
            <Text style={styles.reminderTitle}>
              <fbt desc="Completed check-in optional Leitsatz reminder title">
                Would you like this Leitsatz to return to you?
              </fbt>
            </Text>
            <Text style={styles.reminderCopy}>
              <fbt desc="Completed check-in optional Leitsatz reminder explanation">
                Choose days and times that feel right. You can change or remove the reminder later.
              </fbt>
            </Text>
            <PressableScale
              accessibilityRole="button"
              onPress={_openReminderSetup}
              style={styles.reminderButton}
              testID="success-plan-reminder">
              <Text style={styles.reminderButtonText}>
                <fbt desc="Open Leitsatz reminder setup from completed check-in button">
                  Plan reminder
                </fbt>
              </Text>
            </PressableScale>
          </Animated.View>
        ) : null}
        <Animated.View entering={buttonEntering}>
          <PressableScale accessibilityRole="button" onPress={_finish} style={styles.button} testID="check-in-done">
            <Text style={styles.buttonText}><fbt desc="Button finishing the completed check-in flow">Done</fbt></Text>
          </PressableScale>
        </Animated.View>
        </PersistentScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.paper },
  safeArea: { flex: 1 },
  content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  halo: { width: 76, height: 76, borderRadius: 38, borderWidth: 1.5, borderColor: palette.moss, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.paperRaised },
  check: { fontFamily: type.semibold, color: palette.moss, fontSize: 32 },
  title: { fontFamily: type.semibold, color: palette.ink, fontSize: 32, textAlign: 'center', marginTop: 22 },
  copy: { fontFamily: type.regular, color: palette.inkMuted, fontSize: 15, lineHeight: 22, textAlign: 'center', maxWidth: 330, marginTop: 10 },
  guidingCard: {
    width: '100%',
    maxWidth: 360,
    marginTop: 24,
    padding: 20,
    borderRadius: 22,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: palette.moss,
    backgroundColor: palette.selectionWash,
  },
  guidingLabel: {
    fontFamily: type.semibold,
    color: palette.moss,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  guidingText: {
    fontFamily: type.medium,
    color: palette.ink,
    fontSize: 17,
    lineHeight: 25,
    marginTop: 8,
  },
  reminderOffer: {
    width: '100%',
    maxWidth: 360,
    marginTop: 14,
    padding: 18,
    borderRadius: 22,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: palette.hairline,
    backgroundColor: palette.paperRaised,
  },
  reminderEyebrow: {
    fontFamily: type.semibold,
    color: palette.moss,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  reminderTitle: {
    fontFamily: type.semibold,
    color: palette.ink,
    fontSize: 17,
    lineHeight: 23,
    marginTop: 7,
  },
  reminderCopy: {
    fontFamily: type.regular,
    color: palette.inkMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  reminderButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: palette.moss,
    marginTop: 16,
    paddingHorizontal: 18,
  },
  reminderButtonText: { fontFamily: type.semibold, color: palette.moss, fontSize: 14 },
  button: { minHeight: 50, backgroundColor: actionColors.primaryBackground, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, marginTop: 28 },
  buttonText: { fontFamily: type.semibold, color: actionColors.primaryForeground, fontSize: 14 },
});
