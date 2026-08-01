import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { fbs } from 'fbtee';
import { useMachine } from '@xstate/react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PropsWithChildren } from 'react';

import {
  FEEDBACK_EVENTS,
  FEEDBACK_FAILURE_REASONS,
  FEEDBACK_KINDS,
  FEEDBACK_STATES,
} from '@/constants';
import { palette, type } from '@/features/check-in/ui/theme';
import { feedbackMachine } from '../application/feedback.machine';

const feedbackSymbol: SymbolViewProps['name'] = {
  android: 'feedback',
  ios: 'questionmark.bubble',
  web: 'question_answer',
};

function FeedbackAction({
  label,
  onPress,
  primary = false,
  testID,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
  testID: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.action, primary && styles.primaryAction]}
      testID={testID}>
      <Text style={[styles.actionText, primary && styles.primaryActionText]}>{label}</Text>
    </Pressable>
  );
}

function FeedbackDialog({
  children,
  onRequestClose,
  visible,
}: PropsWithChildren<{
  onRequestClose: () => void;
  visible: boolean;
}>) {
  const content = (
    <View style={styles.overlay} testID="feedback-dialog">
      <Pressable
        accessible={false}
        onPress={onRequestClose}
        style={styles.backdrop}
        testID="feedback-backdrop"
      />
      <View accessibilityViewIsModal style={styles.dialog}>
        {children}
      </View>
    </View>
  );

  if (Platform.OS !== 'android') return visible ? content : null;
  return (
    <Modal
      animationType="fade"
      onRequestClose={onRequestClose}
      transparent
      visible={visible}>
      {content}
    </Modal>
  );
}

export function FeedbackOverlay() {
  const insets = useSafeAreaInsets();
  const [snapshot, , actor] = useMachine(feedbackMachine);
  const idle = snapshot.matches(FEEDBACK_STATES.IDLE);
  const choosingKind = snapshot.matches(FEEDBACK_STATES.CHOOSING_KIND);
  const choosingScreenshot = snapshot.matches(FEEDBACK_STATES.CHOOSING_SCREENSHOT);
  const capturing = snapshot.matches(FEEDBACK_STATES.CAPTURING_SCREENSHOT);
  const composing = snapshot.matches(FEEDBACK_STATES.COMPOSING_EMAIL);
  const failed = snapshot.matches(FEEDBACK_STATES.FAILURE);
  const dialogVisible = choosingKind || choosingScreenshot || composing || failed;
  const _open = () => actor.send({ type: FEEDBACK_EVENTS.OPENED });
  const _askQuestion = () => actor.send({
    type: FEEDBACK_EVENTS.KIND_SELECTED,
    kind: FEEDBACK_KINDS.QUESTION,
  });
  const _sendFeedback = () => actor.send({
    type: FEEDBACK_EVENTS.KIND_SELECTED,
    kind: FEEDBACK_KINDS.FEEDBACK,
  });
  const _includeScreenshot = () => actor.send({ type: FEEDBACK_EVENTS.SCREENSHOT_INCLUDED });
  const _skipScreenshot = () => actor.send({ type: FEEDBACK_EVENTS.SCREENSHOT_SKIPPED });
  const _retry = () => actor.send({ type: FEEDBACK_EVENTS.RETRIED });
  const _cancel = () => actor.send({ type: FEEDBACK_EVENTS.CANCELLED });

  return (
    <>
      {idle ? (
        <Pressable
          accessibilityLabel={String(fbs('Ask a question or send feedback', 'Accessibility label for the global feedback button'))}
          accessibilityRole="button"
          hitSlop={8}
          onPress={_open}
          style={[styles.feedbackButton, { top: insets.top + 4 }]}
          testID="feedback-button">
          <SymbolView
            name={feedbackSymbol}
            resizeMode="scaleAspectFit"
            size={20}
            tintColor={palette.moss}
            weight="medium"
          />
        </Pressable>
      ) : null}
      <FeedbackDialog onRequestClose={_cancel} visible={dialogVisible}>
            {choosingKind ? (
              <>
                <Text style={styles.title}><fbt desc="Feedback choice dialog title">How can we help?</fbt></Text>
                <Text style={styles.copy}>
                  <fbt desc="Feedback choice dialog explanation">Your email app will open so you can review and send the message yourself.</fbt>
                </Text>
                <View style={styles.actions}>
                  <FeedbackAction
                    label={String(fbs('Ask a question', 'Button starting a support question email'))}
                    onPress={_askQuestion}
                    primary
                    testID="feedback-question"
                  />
                  <FeedbackAction
                    label={String(fbs('Send feedback', 'Button starting a feedback email'))}
                    onPress={_sendFeedback}
                    testID="feedback-send"
                  />
                  <FeedbackAction
                    label={String(fbs('Cancel', 'Button cancelling the feedback flow'))}
                    onPress={_cancel}
                    testID="feedback-cancel"
                  />
                </View>
              </>
            ) : null}
            {choosingScreenshot ? (
              <>
                <Text style={styles.title}><fbt desc="Screenshot consent dialog title">Attach this screen?</fbt></Text>
                <Text style={styles.copy}>
                  <fbt desc="Screenshot consent privacy explanation">A screenshot can include private feelings or reflections. It will only be captured and attached if you choose “Attach screenshot.”</fbt>
                </Text>
                <View style={styles.actions}>
                  <FeedbackAction
                    label={String(fbs('Attach screenshot', 'Button consenting to capture and attach the current app screen'))}
                    onPress={_includeScreenshot}
                    primary
                    testID="feedback-attach-screenshot"
                  />
                  <FeedbackAction
                    label={String(fbs('Continue without screenshot', 'Button opening feedback email without a screenshot'))}
                    onPress={_skipScreenshot}
                    testID="feedback-without-screenshot"
                  />
                  <FeedbackAction
                    label={String(fbs('Cancel', 'Button cancelling screenshot consent and feedback'))}
                    onPress={_cancel}
                    testID="feedback-screenshot-cancel"
                  />
                </View>
              </>
            ) : null}
            {composing ? (
              <View style={styles.progress}>
                <ActivityIndicator color={palette.moss} />
                <Text style={styles.progressText}><fbt desc="Email composer opening progress message">Opening your email app…</fbt></Text>
              </View>
            ) : null}
            {failed ? (
              <>
                <Text style={styles.title}><fbt desc="Feedback flow failure dialog title">That did not work.</fbt></Text>
                <Text style={styles.copy}>
                  {snapshot.context.failureReason === FEEDBACK_FAILURE_REASONS.SCREENSHOT
                    ? <fbt desc="Feedback screenshot failure explanation">The screenshot could not be created.</fbt>
                    : snapshot.context.failureReason === FEEDBACK_FAILURE_REASONS.EMAIL_UNAVAILABLE
                      ? <fbt desc="Feedback email unavailable explanation">No email app is configured on this device.</fbt>
                      : <fbt desc="Feedback email composition failure explanation">The email composer could not be opened.</fbt>}
                </Text>
                <View style={styles.actions}>
                  <FeedbackAction
                    label={String(fbs('Try again', 'Button retrying screenshot capture or email composition'))}
                    onPress={_retry}
                    primary
                    testID="feedback-retry"
                  />
                  <FeedbackAction
                    label={String(fbs('Cancel', 'Button closing a feedback error'))}
                    onPress={_cancel}
                    testID="feedback-error-cancel"
                  />
                </View>
              </>
            ) : null}
      </FeedbackDialog>
      {capturing ? <View pointerEvents="none" testID="feedback-capturing" /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  feedbackButton: {
    position: 'absolute',
    right: 12,
    zIndex: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.paper,
  },
  overlay: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    padding: 24,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 30,
  },
  backdrop: {
    backgroundColor: 'rgba(42, 39, 34, 0.36)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: palette.paperRaised,
    borderCurve: 'continuous',
    borderRadius: 28,
    padding: 24,
  },
  title: {
    color: palette.ink,
    fontFamily: type.semibold,
    fontSize: 24,
    lineHeight: 30,
  },
  copy: {
    color: palette.inkMuted,
    fontFamily: type.regular,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
  },
  actions: { gap: 10, marginTop: 24 },
  action: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: palette.hairline,
    borderCurve: 'continuous',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  primaryAction: { backgroundColor: palette.moss, borderColor: palette.moss },
  actionText: { color: palette.ink, fontFamily: type.medium, fontSize: 15 },
  primaryActionText: { color: palette.paperRaised },
  progress: { alignItems: 'center', gap: 14, paddingVertical: 14 },
  progressText: { color: palette.ink, fontFamily: type.medium, fontSize: 15 },
});
