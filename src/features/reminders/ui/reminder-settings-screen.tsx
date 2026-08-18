import { useSelector } from '@xstate/react';
import { PressableScale } from 'pressto';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  NAVIGATION_EVENTS,
  REMINDER_EVENTS,
  REMINDER_TARGET_KINDS,
} from '@/constants';
import { AppBackButton } from '@/components/ui/app-back-button';
import { actionColors, palette, type } from '@/features/check-in/ui/theme';
import { useAppLocale } from '@/localization/app-locale-provider';
import { formatWeekday } from '@/localization/date-copy';
import { useAppNavigationActor } from '@/navigation/app-navigation.provider';
import type { PulseReminderAssignment } from '../domain/reminder-assignment';
import {
  confirmReminderDeletion,
  deleteReminderAccessibilityLabel,
  deleteReminderText,
} from './reminder-deletion';

const _selectReminderContext = (
  snapshot: ReturnType<ReturnType<typeof useAppNavigationActor>['getSnapshot']>,
) => ({
  assignment: snapshot.context.reminderAssignments.find(
    (assignment) => assignment.targetKind === REMINDER_TARGET_KINDS.PULSE,
  ),
  error: snapshot.context.reminderError,
});

function PulseReminderCard({ assignment }: { assignment: PulseReminderAssignment }) {
  const actor = useAppNavigationActor();
  const locale = useAppLocale();
  const editReminder = () => actor.send({
    type: REMINDER_EVENTS.ASSIGNMENT_EDIT_REQUESTED,
    assignmentId: assignment.id,
  });
  const toggle = () => actor.send({
    type: REMINDER_EVENTS.ASSIGNMENT_TOGGLED,
    assignmentId: assignment.id,
  });
  const deleteAssignment = () => actor.send({
    type: REMINDER_EVENTS.ASSIGNMENT_DELETE_REQUESTED,
    assignmentId: assignment.id,
  });
  const confirmDelete = () => confirmReminderDeletion(deleteAssignment);
  const deleteAccessibilityLabel = deleteReminderAccessibilityLabel();

  return (
    <View style={styles.reminderCard}>
      <Text style={styles.assignmentSectionLabel}><fbt desc="Pulse reminder assignment kind">PULSE</fbt></Text>
      <Text style={styles.assignmentTitle}><fbt desc="Pulse reminder content description">Check in with yourself</fbt></Text>
      <PressableScale accessibilityRole="button" onPress={editReminder} style={styles.reminderEdit} testID={`reminder-edit-${assignment.id}`}>
        <View style={styles.assignmentCopy}>
          <Text style={styles.reminderTiming}>
            {assignment.weekdays.map((weekday) => formatWeekday({ locale, weekday })).join(', ')} · {assignment.times.map(({ hour, minute }) => `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`).join(', ')}
          </Text>
        </View>
        <Text style={styles.editLabel}><fbt desc="Edit reminder button">Edit</fbt></Text>
      </PressableScale>
      <View style={styles.assignmentRow}>
        <Text style={styles.assignmentStatus}>
          {assignment.enabled
            ? <fbt desc="Enabled reminder assignment status">Active</fbt>
            : <fbt desc="Disabled reminder assignment status">Off</fbt>}
        </Text>
        <View style={styles.assignmentActions}>
          <PressableScale accessibilityRole="button" onPress={toggle} style={styles.toggleAction} testID={`reminder-assignment-toggle-${assignment.id}`}>
            <Text style={styles.toggleActionText}>
              {assignment.enabled
                ? <fbt desc="Turn reminder assignment off button">Turn off</fbt>
                : <fbt desc="Turn reminder assignment on button">Turn on</fbt>}
            </Text>
          </PressableScale>
          <PressableScale accessibilityLabel={deleteAccessibilityLabel} accessibilityRole="button" onPress={confirmDelete} style={styles.deleteAction} testID={`reminder-assignment-delete-${assignment.id}`}>
            <Text style={styles.deleteActionText}>{deleteReminderText()}</Text>
          </PressableScale>
        </View>
      </View>
    </View>
  );
}

export function ReminderSettingsScreen() {
  const actor = useAppNavigationActor();
  const { assignment, error } = useSelector(actor, _selectReminderContext);
  const _back = () => actor.send({ type: NAVIGATION_EVENTS.BACK_REQUESTED });
  const _newReminder = () => actor.send({ type: REMINDER_EVENTS.CREATE_REQUESTED });
  const _retry = () => actor.send({ type: REMINDER_EVENTS.RETRY_REQUESTED });

  return (
    <View style={styles.page} testID="reminder-settings-screen">
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.header}>
          <AppBackButton
            onPress={_back}
            testID="reminder-settings-back"
          />
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.eyebrow}><fbt desc="Reminder settings eyebrow">GENTLE REMINDERS</fbt></Text>
          <Text style={styles.title}><fbt desc="Pulse reminder settings title">A moment to check in.</fbt></Text>
          <Text style={styles.copy}><fbt desc="Pulse reminder settings explanation">Choose when Youmotion may gently invite you back to Pulse. Leitsatz reminders live with each Leitsatz.</fbt></Text>
          {assignment ? <PulseReminderCard assignment={assignment} /> : null}
          {!assignment ? (
            <View style={styles.empty}>
              <Text style={styles.reminderTitle}><fbt desc="Empty Pulse reminder settings title">No Pulse reminder yet</fbt></Text>
              <Text style={styles.copy}><fbt desc="Empty Pulse reminder settings explanation">Add one when a gentle invitation to check in would help.</fbt></Text>
            </View>
          ) : null}
          {error ? (
            <View style={styles.errorCard}>
              <Text style={styles.error}>
                {error === 'Your reminders could not be loaded.'
                  ? <fbt desc="Reminder loading failure message">Your reminders could not be loaded.</fbt>
                  : <fbt desc="Reminder change failure message">Your reminder change could not be saved.</fbt>}
              </Text>
              <PressableScale
                accessibilityRole="button"
                onPress={_retry}
                style={styles.retryAction}
                testID="reminder-settings-retry"
              >
                <Text style={styles.retryActionText}><fbt desc="Retry loading reminders button">Try again</fbt></Text>
              </PressableScale>
            </View>
          ) : null}
          <PressableScale
            accessibilityRole="button"
            onPress={_newReminder}
            style={styles.action}
            testID="reminder-settings-new"
          >
            <Text style={styles.actionText}><fbt desc="New Pulse reminder setup button">Add Pulse reminder</fbt></Text>
          </PressableScale>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.paper },
  safeArea: { flex: 1 },
  header: { minHeight: 52, justifyContent: 'center', paddingHorizontal: 20 },
  content: { flexGrow: 1, padding: 24, paddingTop: 20, gap: 16 },
  eyebrow: { fontFamily: type.semibold, color: palette.moss, fontSize: 11, letterSpacing: 1.4 },
  title: { fontFamily: type.semibold, color: palette.ink, fontSize: 34, lineHeight: 40 },
  copy: { fontFamily: type.regular, color: palette.inkMuted, fontSize: 14, lineHeight: 21 },
  reminderCard: { borderWidth: 1, borderColor: palette.hairline, borderRadius: 22, borderCurve: 'continuous', padding: 18, gap: 6 },
  reminderEdit: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: palette.hairline, paddingTop: 12, marginTop: 8 },
  editLabel: { fontFamily: type.semibold, color: palette.moss, fontSize: 13 },
  reminderTitle: { fontFamily: type.semibold, color: palette.ink, fontSize: 17 },
  reminderTiming: { fontFamily: type.regular, color: palette.inkMuted, fontSize: 14, lineHeight: 21 },
  assignmentSectionLabel: { fontFamily: type.semibold, color: palette.moss, fontSize: 10, letterSpacing: 1.1, marginTop: 10 },
  assignmentRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderTopWidth: 1, borderTopColor: palette.hairline, paddingTop: 10, marginTop: 2 },
  assignmentCopy: { flex: 1, gap: 2 },
  assignmentTitle: { fontFamily: type.medium, color: palette.ink, fontSize: 15, lineHeight: 21 },
  assignmentStatus: { fontFamily: type.regular, color: palette.inkMuted, fontSize: 13, lineHeight: 19 },
  assignmentActions: { flexDirection: 'row', gap: 8 },
  toggleAction: { minHeight: 40, justifyContent: 'center', borderWidth: 1, borderColor: palette.hairline, borderRadius: 14, borderCurve: 'continuous', paddingHorizontal: 12 },
  toggleActionText: { fontFamily: type.semibold, color: palette.ink, fontSize: 12 },
  deleteAction: { minHeight: 40, justifyContent: 'center', borderWidth: 1, borderColor: palette.hairline, borderRadius: 14, borderCurve: 'continuous', paddingHorizontal: 12 },
  deleteActionText: { fontFamily: type.semibold, color: palette.danger, fontSize: 12 },
  empty: { borderWidth: 1, borderColor: palette.hairline, borderRadius: 22, borderCurve: 'continuous', padding: 20, gap: 8 },
  error: { fontFamily: type.medium, color: palette.danger, fontSize: 14 },
  errorCard: { alignItems: 'flex-start', gap: 8 },
  retryAction: { minHeight: 40, justifyContent: 'center', borderWidth: 1, borderColor: palette.hairline, borderRadius: 14, borderCurve: 'continuous', paddingHorizontal: 14 },
  retryActionText: { fontFamily: type.semibold, color: palette.ink, fontSize: 13 },
  action: { minHeight: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 18, borderCurve: 'continuous', backgroundColor: actionColors.primaryBackground, paddingHorizontal: 18 },
  actionText: { fontFamily: type.semibold, color: actionColors.primaryForeground, fontSize: 15 },
});
