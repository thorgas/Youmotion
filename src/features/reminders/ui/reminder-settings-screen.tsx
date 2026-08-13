import { useSelector } from '@xstate/react';
import { fbs } from 'fbtee';
import { PressableScale } from 'pressto';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  NAVIGATION_EVENTS,
  REMINDER_EVENTS,
  REMINDER_TARGET_KINDS,
} from '@/constants';
import { AppBackButton } from '@/components/ui/app-back-button';
import { palette, type } from '@/features/check-in/ui/theme';
import { useAppNavigationActor } from '@/navigation/app-navigation.provider';

const _selectReminderContext = (
  snapshot: ReturnType<ReturnType<typeof useAppNavigationActor>['getSnapshot']>,
) => ({
  schedules: snapshot.context.reminderSchedules,
  assignments: snapshot.context.reminderAssignments,
  statements: snapshot.context.beliefStatements,
  error: snapshot.context.reminderError,
});

export function ReminderSettingsScreen() {
  const actor = useAppNavigationActor();
  const { schedules, assignments, statements, error } = useSelector(actor, _selectReminderContext);
  const _back = () => actor.send({ type: NAVIGATION_EVENTS.BACK_REQUESTED });
  const _newSchedule = () => actor.send({ type: REMINDER_EVENTS.NEW_SCHEDULE_REQUESTED });

  return (
    <View style={styles.page} testID="reminder-settings-screen">
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.header}>
          <AppBackButton
            accessibilityLabel={String(fbs('Back', 'Reminder settings back button accessibility label'))}
            label={String(fbs('Back', 'Reminder settings back button'))}
            onPress={_back}
            testID="reminder-settings-back"
          />
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.eyebrow}><fbt desc="Reminder settings eyebrow">GENTLE REMINDERS</fbt></Text>
          <Text style={styles.title}><fbt desc="Reminder settings title">Your reminder schedules.</fbt></Text>
          <Text style={styles.copy}><fbt desc="Reminder settings explanation">Schedules stay on this device and can be used by the Pulse or a positive Leitsatz.</fbt></Text>
          {schedules.map((schedule) => {
            const scheduleAssignments = assignments.filter(
              (assignment) => assignment.scheduleId === schedule.id,
            );
            const usageCount = scheduleAssignments.filter(
              (assignment) => assignment.enabled,
            ).length;
            return (
              <View key={schedule.id} style={styles.scheduleCard}>
                <Text style={styles.scheduleTitle}>{schedule.name}</Text>
                <Text style={styles.copy}>
                  {schedule.weekdays.join(', ')} · {schedule.times.map(({ hour, minute }) => (
                    `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
                  )).join(', ')}
                </Text>
                <Text style={styles.usage}>{usageCount} <fbt desc="Reminder schedule assignment count label">active uses</fbt></Text>
                {scheduleAssignments.map((assignment) => {
                  const statement = assignment.targetKind === REMINDER_TARGET_KINDS.GUIDING_BELIEF
                    ? statements.find((candidate) => (
                        candidate.beliefSystemId === assignment.beliefSystemId
                      ))?.guidingStatement
                    : undefined;
                  const _toggle = () => actor.send({
                    type: REMINDER_EVENTS.ASSIGNMENT_TOGGLED,
                    assignmentId: assignment.id,
                  });
                  return (
                    <View key={assignment.id} style={styles.assignmentRow}>
                      <View style={styles.assignmentCopy}>
                        <Text numberOfLines={1} style={styles.assignmentTitle}>
                          {assignment.targetKind === REMINDER_TARGET_KINDS.PULSE
                            ? <fbt desc="Pulse reminder assignment label">Pulse</fbt>
                            : statement ?? <fbt desc="Unavailable Leitsatz reminder assignment label">Leitsatz</fbt>}
                        </Text>
                        <Text style={styles.copy}>
                          {assignment.enabled
                            ? <fbt desc="Enabled reminder assignment status">Active</fbt>
                            : <fbt desc="Disabled reminder assignment status">Off</fbt>}
                        </Text>
                      </View>
                      <PressableScale
                        accessibilityRole="button"
                        onPress={_toggle}
                        style={styles.toggleAction}
                        testID={`reminder-assignment-toggle-${assignment.id}`}
                      >
                        <Text style={styles.toggleActionText}>
                          {assignment.enabled
                            ? <fbt desc="Turn reminder assignment off button">Turn off</fbt>
                            : <fbt desc="Turn reminder assignment on button">Turn on</fbt>}
                        </Text>
                      </PressableScale>
                    </View>
                  );
                })}
              </View>
            );
          })}
          {schedules.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.scheduleTitle}><fbt desc="Empty reminder settings title">No schedules yet</fbt></Text>
              <Text style={styles.copy}><fbt desc="Empty reminder settings explanation">Create a schedule when you want a gentle invitation to return.</fbt></Text>
            </View>
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PressableScale
            accessibilityRole="button"
            onPress={_newSchedule}
            style={styles.action}
            testID="reminder-settings-new"
          >
            <Text style={styles.actionText}><fbt desc="New Pulse reminder setup button">Create Pulse reminder</fbt></Text>
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
  scheduleCard: { borderWidth: 1, borderColor: palette.hairline, borderRadius: 22, borderCurve: 'continuous', padding: 18, gap: 6 },
  scheduleTitle: { fontFamily: type.semibold, color: palette.ink, fontSize: 17 },
  usage: { fontFamily: type.medium, color: palette.moss, fontSize: 12 },
  assignmentRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: palette.hairline, paddingTop: 10, marginTop: 4 },
  assignmentCopy: { flex: 1 },
  assignmentTitle: { fontFamily: type.medium, color: palette.ink, fontSize: 14 },
  toggleAction: { minHeight: 40, justifyContent: 'center', borderWidth: 1, borderColor: palette.hairline, borderRadius: 14, borderCurve: 'continuous', paddingHorizontal: 12 },
  toggleActionText: { fontFamily: type.semibold, color: palette.ink, fontSize: 12 },
  empty: { borderWidth: 1, borderColor: palette.hairline, borderRadius: 22, borderCurve: 'continuous', padding: 20, gap: 8 },
  error: { fontFamily: type.medium, color: palette.danger, fontSize: 14 },
  action: { minHeight: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 18, borderCurve: 'continuous', backgroundColor: palette.ink, paddingHorizontal: 18 },
  actionText: { fontFamily: type.semibold, color: '#FFFFFF', fontSize: 15 },
});
