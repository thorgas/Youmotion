import { useSelector } from '@xstate/react';
import {
  DateTimePicker,
  type DateTimePickerProps,
} from '@expo/ui/community/datetime-picker';
import { fbs } from 'fbtee';
import { PressableScale } from 'pressto';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  NAVIGATION_EVENTS,
  MAX_REMINDER_TIMES,
  REMINDER_EVENTS,
  REMINDER_NOTIFICATION_CONTENT,
  REMINDER_STATES,
  REMINDER_TARGET_KINDS,
} from '@/constants';
import { AppBackButton } from '@/components/ui/app-back-button';
import { ConfirmedPickerModal } from '@/components/ui/confirmed-picker-modal';
import {
  beliefStatementForId,
} from '@/features/check-in/domain/belief-statement';
import { actionColors, palette, type } from '@/features/check-in/ui/theme';
import { useAppNavigationActor } from '@/navigation/app-navigation.provider';
import type {
  ReminderLocalTime,
  ReminderWeekday,
} from '../domain/reminder-timing';
import type { ReminderNotificationContent } from '../domain/reminder-assignment';

function reminderWeekdayOptions() {
  return [
    { label: String(fbs('Su', 'Abbreviated Sunday in reminder weekday picker')), weekday: 1 },
    { label: String(fbs('Mo', 'Abbreviated Monday in reminder weekday picker')), weekday: 2 },
    { label: String(fbs('Tu', 'Abbreviated Tuesday in reminder weekday picker')), weekday: 3 },
    { label: String(fbs('We', 'Abbreviated Wednesday in reminder weekday picker')), weekday: 4 },
    { label: String(fbs('Th', 'Abbreviated Thursday in reminder weekday picker')), weekday: 5 },
    { label: String(fbs('Fr', 'Abbreviated Friday in reminder weekday picker')), weekday: 6 },
    { label: String(fbs('Sa', 'Abbreviated Saturday in reminder weekday picker')), weekday: 7 },
  ] satisfies readonly { label: string; weekday: ReminderWeekday }[];
}

function timeSlotKey(index: number) {
  if (index === 0) return 'primary';
  if (index === 1) return 'secondary';
  if (index === 2) return 'tertiary';
  return 'quaternary';
}
const _selectSnapshot = (snapshot: ReturnType<ReturnType<typeof useAppNavigationActor>['getSnapshot']>) => snapshot;

function ActionButton({
  disabled = false,
  label,
  onPress,
  secondary = false,
  testID,
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  secondary?: boolean;
  testID: string;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.action,
        secondary && styles.actionSecondary,
        disabled && styles.actionDisabled,
      ]}
      testID={testID}
    >
      <Text style={[styles.actionText, secondary && styles.actionTextSecondary]}>
        {label}
      </Text>
    </PressableScale>
  );
}

function PositiveStatementCard({
  newStatement = true,
  statement,
}: {
  newStatement?: boolean;
  statement: string;
}) {
  return (
    <View style={styles.statementCard}>
      <Text style={styles.cardEyebrow}>
        {newStatement
          ? <fbt desc="New positive Leitsatz reminder card label">YOUR NEW LEITSATZ</fbt>
          : <fbt desc="Focused positive Leitsatz reminder card label">YOUR LEITSATZ</fbt>}
      </Text>
      <Text style={styles.statement}>“{statement}”</Text>
    </View>
  );
}

function TimeRow({
  canRemove,
  hour,
  index,
  minute,
  onChange,
  onDismiss,
  onOpen,
  onRemove,
  pickerOpen,
}: {
  canRemove: boolean;
  hour: number;
  index: number;
  minute: number;
  onChange: NonNullable<DateTimePickerProps['onValueChange']>;
  onDismiss: () => void;
  onOpen: () => void;
  onRemove: () => void;
  pickerOpen: boolean;
}) {
  const value = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  const pickerValue = new Date(2000, 0, 1, hour, minute);
  return (
    <View style={styles.timeCard} testID={`reminder-time-${index}`}>
      <PressableScale
        accessibilityLabel={`Reminder time ${value}`}
        accessibilityRole="button"
        onPress={onOpen}
        style={styles.timePickerButton}
        testID={`reminder-time-picker-${index}`}
      >
        <Text style={styles.timeText}>{value}</Text>
        <Text accessibilityElementsHidden style={styles.timeDisclosure}>›</Text>
      </PressableScale>
      {Platform.OS === 'ios' ? (
        <ConfirmedPickerModal
          doneLabel={String(fbs('Done', 'Confirm reminder time picker button'))}
          onDone={onDismiss}
          testID={`reminder-time-modal-${index}`}
          title={String(fbs('Choose a time', 'Reminder time picker modal title'))}
          visible={pickerOpen}
        >
          <DateTimePicker
            accentColor={palette.moss}
            display="spinner"
            mode="time"
            onValueChange={onChange}
            testID={`reminder-time-spinner-${index}`}
            value={pickerValue}
          />
        </ConfirmedPickerModal>
      ) : pickerOpen ? (
            <DateTimePicker
              accentColor={palette.moss}
              mode="time"
              onDismiss={onDismiss}
              onValueChange={onChange}
              presentation="dialog"
              value={pickerValue}
            />
      ) : null}
      {canRemove ? (
        <ActionButton label={String(fbs('Remove time', 'Remove reminder time button'))} onPress={onRemove} secondary testID={`reminder-time-remove-${index}`} />
      ) : null}
    </View>
  );
}

type ReminderActor = ReturnType<typeof useAppNavigationActor>;

function OfferContent({
  actor,
  pulseTarget,
  statement,
}: {
  actor: ReminderActor;
  pulseTarget: boolean;
  statement: string | undefined;
}) {
  const _accept = () => actor.send({ type: REMINDER_EVENTS.OFFER_ACCEPTED });
  const _decline = () => actor.send({ type: REMINDER_EVENTS.OFFER_DECLINED });
  return (
    <>
      <Text style={styles.eyebrow}>
        {pulseTarget
          ? <fbt desc="Pulse reminder offer eyebrow">PULSE REMINDER</fbt>
          : <fbt desc="Saved positive Leitsatz eyebrow">LEITSATZ SAVED</fbt>}
      </Text>
      <Text style={styles.title}>
        {pulseTarget
          ? <fbt desc="Pulse reminder offer title">Would you like a gentle reminder to check in?</fbt>
          : <fbt desc="Positive Leitsatz reminder offer title">Would you like a friendly reminder of your new Leitsatz?</fbt>}
      </Text>
      {statement ? <PositiveStatementCard statement={statement} /> : null}
      <Text style={styles.copy}>
        <fbt desc="Reminder permission before timing explanation">After permission, you can choose the days, times, and words that may appear.</fbt>
      </Text>
      <ActionButton label={String(fbs('Allow notifications and continue', 'Button requesting reminder permission'))} onPress={_accept} testID="reminder-offer-accept" />
      <ActionButton label={String(fbs('Not now', 'Button declining reminder setup'))} onPress={_decline} secondary testID="reminder-offer-decline" />
    </>
  );
}

function PermissionDeniedContent({
  actor,
  pulseTarget,
  statement,
}: {
  actor: ReminderActor;
  pulseTarget: boolean;
  statement: string | undefined;
}) {
  const _openSettings = () => actor.send({ type: REMINDER_EVENTS.SETTINGS_REQUESTED });
  const _checkPermission = () => actor.send({ type: REMINDER_EVENTS.SETTINGS_RETURNED });
  const _decline = () => actor.send({ type: REMINDER_EVENTS.OFFER_DECLINED });
  return (
    <>
      <Text style={styles.eyebrow}><fbt desc="Notification permission eyebrow">NOTIFICATIONS</fbt></Text>
      <Text style={styles.title}><fbt desc="Notification permission denied title">Notifications are turned off.</fbt></Text>
      <Text style={styles.copy}>
        {pulseTarget
          ? <fbt desc="Pulse notification permission denied explanation">No reminder was created.</fbt>
          : <fbt desc="Leitsatz notification permission denied explanation">Your Leitsatz is saved. No reminder was created.</fbt>}
      </Text>
      {statement ? <PositiveStatementCard statement={statement} /> : null}
      <ActionButton label={String(fbs('Open system settings', 'Open notification system settings button'))} onPress={_openSettings} testID="reminder-open-settings" />
      <ActionButton label={String(fbs('Check again', 'Recheck notification permission button'))} onPress={_checkPermission} secondary testID="reminder-check-permission" />
      <ActionButton label={String(fbs('Not now', 'Leave denied reminder flow button'))} onPress={_decline} secondary testID="reminder-permission-cancel" />
    </>
  );
}

function NotificationContentChoice({ actor, notificationContent }: {
  actor: ReminderActor;
  notificationContent: ReminderNotificationContent;
}) {
  const _selectGeneral = () => actor.send({
    type: REMINDER_EVENTS.CONTENT_CHANGED,
    notificationContent: REMINDER_NOTIFICATION_CONTENT.GENERAL,
  });
  const _selectFull = () => actor.send({
    type: REMINDER_EVENTS.CONTENT_CHANGED,
    notificationContent: REMINDER_NOTIFICATION_CONTENT.LEITSATZ,
  });
  const showsLeitsatz = notificationContent === REMINDER_NOTIFICATION_CONTENT.LEITSATZ;
  return (
    <View style={styles.previewSection}>
      <Text style={styles.fieldLabel}>
        <fbt desc="Leitsatz notification preview field label">NOTIFICATION PREVIEW</fbt>
      </Text>
      <Text style={styles.fieldHint}>
        <fbt desc="Leitsatz notification preview privacy explanation">Choose what may appear on your lock screen for this reminder.</fbt>
      </Text>
      <PressableScale
        accessibilityRole="radio"
        accessibilityState={{ checked: !showsLeitsatz }}
        onPress={_selectGeneral}
        style={[styles.previewChoice, !showsLeitsatz && styles.previewChoiceSelected]}
        testID="reminder-preview-general"
      >
        <Text style={styles.previewTitle}>
          <fbt desc="General Leitsatz notification preview choice">General message</fbt>
        </Text>
        <Text style={styles.previewCopy}>
          <fbt desc="General Leitsatz notification preview explanation">Your Leitsatz stays hidden on the lock screen.</fbt>
        </Text>
      </PressableScale>
      <PressableScale
        accessibilityRole="radio"
        accessibilityState={{ checked: showsLeitsatz }}
        onPress={_selectFull}
        style={[styles.previewChoice, showsLeitsatz && styles.previewChoiceSelected]}
        testID="reminder-preview-full"
      >
        <Text style={styles.previewTitle}>
          <fbt desc="Full Leitsatz notification preview choice">Show Leitsatz</fbt>
        </Text>
        <Text style={styles.previewCopy}>
          <fbt desc="Full Leitsatz notification preview explanation">The complete Leitsatz appears in the notification.</fbt>
        </Text>
      </PressableScale>
    </View>
  );
}

function ReminderEditorContent({
  actor,
  editing,
  notificationContent,
  pickerIndex,
  pulseTarget,
  times,
  weekdays,
}: {
  actor: ReminderActor;
  editing: boolean;
  notificationContent: ReminderNotificationContent;
  pickerIndex: number | null;
  pulseTarget: boolean;
  times: readonly ReminderLocalTime[];
  weekdays: readonly ReminderWeekday[];
}) {
  const _addTime = () => actor.send({ type: REMINDER_EVENTS.TIME_ADDED });
  const _saveReminder = () => actor.send({ type: REMINDER_EVENTS.SAVE_REQUESTED });
  const selectedWeekdays = new Set(weekdays);
  return (
    <>
      <Text style={styles.eyebrow}>
        {editing
          ? <fbt desc="Edit reminder eyebrow">EDIT REMINDER</fbt>
          : <fbt desc="New reminder eyebrow">NEW REMINDER</fbt>}
      </Text>
      <Text style={styles.title}>
        {editing
          ? <fbt desc="Edit reminder title">Adjust this reminder.</fbt>
          : <fbt desc="New reminder title">Choose when it should return.</fbt>}
      </Text>
      {editing ? (
        <Text style={styles.copy}>
          <fbt desc="Reminder timing editing explanation">These days, times, and notification words belong only to this reminder.</fbt>
        </Text>
      ) : null}
      <Text style={styles.fieldLabel}><fbt desc="Reminder weekdays label">DAYS</fbt></Text>
      <View style={styles.weekdayRow}>
        {reminderWeekdayOptions().map(({ label, weekday }) => {
          const selected = selectedWeekdays.has(weekday);
          const _toggle = () => actor.send({ type: REMINDER_EVENTS.WEEKDAY_TOGGLED, weekday });
          return (
            <PressableScale accessibilityRole="button" accessibilityState={{ selected }} key={`${label}-${weekday}`} onPress={_toggle} style={[styles.weekday, selected && styles.weekdaySelected]} testID={`reminder-weekday-${weekday}`}>
              <Text style={[styles.weekdayText, selected && styles.weekdayTextSelected]}>{label}</Text>
            </PressableScale>
          );
        })}
      </View>
      <Text style={styles.fieldLabel}><fbt desc="Reminder time label">TIME</fbt></Text>
      {times.map(({ hour, minute }, index) => {
        const _open = () => actor.send({ type: REMINDER_EVENTS.TIME_PICKER_REQUESTED, index });
        const _dismiss = () => actor.send({ type: REMINDER_EVENTS.TIME_PICKER_DISMISSED });
        const _change: NonNullable<DateTimePickerProps['onValueChange']> = (...parameters) => {
          const value = parameters[1];
          actor.send({
            type: REMINDER_EVENTS.TIME_CHANGED,
            index,
            hour: value.getHours(),
            minute: value.getMinutes(),
          });
        };
        const _remove = () => actor.send({ type: REMINDER_EVENTS.TIME_REMOVED, index });
        return <TimeRow canRemove={times.length > 1} hour={hour} index={index} key={timeSlotKey(index)} minute={minute} onChange={_change} onDismiss={_dismiss} onOpen={_open} onRemove={_remove} pickerOpen={pickerIndex === index} />;
      })}
      {times.length < MAX_REMINDER_TIMES ? <ActionButton label={String(fbs('Add another time', 'Add reminder time button'))} onPress={_addTime} secondary testID="reminder-time-add" /> : null}
      {!pulseTarget ? (
        <NotificationContentChoice actor={actor} notificationContent={notificationContent} />
      ) : null}
      <ActionButton
        label={editing
          ? String(fbs('Save changes', 'Save reminder changes button'))
          : String(fbs('Activate reminder', 'Save and activate reminder button'))}
        onPress={_saveReminder}
        testID="reminder-save"
      />
    </>
  );
}

function ActiveContent({ actor, statement }: { actor: ReminderActor; statement: string | undefined }) {
  const _done = () => actor.send({ type: REMINDER_EVENTS.DONE });
  const _sendTest = () => actor.send({ type: REMINDER_EVENTS.TEST_REQUESTED });
  return (
    <>
      <Text style={styles.eyebrow}><fbt desc="Active reminder eyebrow">REMINDER ACTIVE</fbt></Text>
      <Text style={styles.title}><fbt desc="Active positive Leitsatz reminder title">Your reminder is ready.</fbt></Text>
      {statement ? <PositiveStatementCard statement={statement} /> : null}
      <ActionButton label={String(fbs('Send test notification', 'Send test reminder button'))} onPress={_sendTest} secondary testID="reminder-send-test" />
      <ActionButton label={String(fbs('Done', 'Finish reminder setup button'))} onPress={_done} testID="reminder-done" />
    </>
  );
}

function GuidingBeliefContent({
  actor,
  editable,
  targetHydrated,
  statement,
}: {
  actor: ReminderActor;
  editable: boolean;
  targetHydrated: boolean;
  statement: string | undefined;
}) {
  const _openPulse = () => actor.send({ type: REMINDER_EVENTS.OPEN_PULSE_REQUESTED });
  const _editReminder = () => actor.send({ type: REMINDER_EVENTS.EDIT_REQUESTED });
  return (
    <>
      <Text style={styles.eyebrow}><fbt desc="Notification-opened Leitsatz eyebrow">YOUR LEITSATZ</fbt></Text>
      <Text style={styles.title}><fbt desc="Notification-opened Leitsatz title">A thought that may accompany you.</fbt></Text>
      {statement ? <PositiveStatementCard newStatement={false} statement={statement} /> : targetHydrated ? (
        <Text style={styles.copy}><fbt desc="Unavailable notification target copy">This Leitsatz is no longer available.</fbt></Text>
      ) : (
        <View style={styles.inlineLoading}>
          <ActivityIndicator color={palette.moss} />
          <Text style={styles.copy}><fbt desc="Loading notification target copy">Preparing your Leitsatz…</fbt></Text>
        </View>
      )}
      <ActionButton label={String(fbs('Open Pulse', 'Open Pulse from Leitsatz notification button'))} onPress={_openPulse} testID="reminder-open-pulse" />
      {statement && editable ? <ActionButton label={String(fbs('Edit reminder', 'Edit Leitsatz reminder button'))} onPress={_editReminder} secondary testID="reminder-edit" /> : null}
    </>
  );
}

function reminderScreenLoading(
  snapshot: ReturnType<ReturnType<typeof useAppNavigationActor>['getSnapshot']>,
) {
  return snapshot.matches(REMINDER_STATES.REQUESTING_PERMISSION)
    || snapshot.matches(REMINDER_STATES.CHECKING_PERMISSION)
    || snapshot.matches(REMINDER_STATES.SAVING);
}

export function LeitsatzReminderScreen() {
  const actor = useAppNavigationActor();
  const snapshot = useSelector(actor, _selectSnapshot);
  const context = snapshot.context;
  const statement = context.reminderTargetBeliefSystemId
    ? beliefStatementForId({
        beliefSystemId: context.reminderTargetBeliefSystemId,
        statements: context.beliefStatements,
      })?.guidingStatement
    : undefined;
  const pulseTarget = context.reminderTargetKind === REMINDER_TARGET_KINDS.PULSE;
  const _back = () => actor.send({ type: NAVIGATION_EVENTS.BACK_REQUESTED });

  if (reminderScreenLoading(snapshot)) {
    return (
      <View style={styles.loading} testID="reminder-loading">
        <ActivityIndicator color={palette.moss} />
        <Text style={styles.copy}><fbt desc="Reminder setup loading state">Preparing your reminder…</fbt></Text>
      </View>
    );
  }

  return (
    <View style={styles.page} testID="leitsatz-reminder-screen">
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.header}>
          <AppBackButton
            onPress={_back}
            testID="reminder-back"
          />
        </View>
        <ScrollView
          contentContainerStyle={styles.content}
          scrollEnabled={context.reminderTimePickerIndex === null}
        >
          {snapshot.matches(REMINDER_STATES.OFFER) ? (
            <OfferContent actor={actor} pulseTarget={pulseTarget} statement={statement} />
          ) : null}
          {snapshot.matches(REMINDER_STATES.PERMISSION_DENIED) ? (
            <PermissionDeniedContent
              actor={actor}
              pulseTarget={pulseTarget}
              statement={statement}
            />
          ) : null}
          {snapshot.matches(REMINDER_STATES.EDITOR) ? (
            <ReminderEditorContent actor={actor} editing={context.reminderAssignmentDraftId !== null} notificationContent={context.reminderNotificationContentDraft} pickerIndex={context.reminderTimePickerIndex} pulseTarget={pulseTarget} times={context.reminderTimesDraft} weekdays={context.reminderWeekdaysDraft} />
          ) : null}
          {snapshot.matches(REMINDER_STATES.ACTIVE) ? (
            <ActiveContent actor={actor} statement={statement} />
          ) : null}
          {snapshot.matches(REMINDER_STATES.GUIDING_BELIEF) ? (
            <GuidingBeliefContent actor={actor} editable={context.reminderAssignments.some((assignment) => assignment.id === context.reminderAssignmentDraftId)} statement={statement} targetHydrated={context.beliefStatementsHydrated && context.reminderDataHydrated} />
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.paper },
  safeArea: { flex: 1 },
  header: { minHeight: 52, justifyContent: 'center', paddingHorizontal: 20 },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 32, gap: 16 },
  eyebrow: { fontFamily: type.semibold, color: palette.moss, fontSize: 11, letterSpacing: 1.4 },
  title: { fontFamily: type.semibold, color: palette.ink, fontSize: 34, lineHeight: 40 },
  copy: { fontFamily: type.regular, color: palette.inkMuted, fontSize: 15, lineHeight: 23 },
  error: { fontFamily: type.medium, color: palette.danger, fontSize: 14, lineHeight: 20 },
  statementCard: { minHeight: 150, justifyContent: 'center', backgroundColor: palette.paperRaised, borderColor: palette.hairline, borderWidth: 1, borderRadius: 24, borderCurve: 'continuous', padding: 22 },
  cardEyebrow: { fontFamily: type.semibold, color: palette.inkMuted, fontSize: 10, letterSpacing: 1.2, marginBottom: 14 },
  statement: { fontFamily: type.medium, color: palette.ink, fontSize: 23, lineHeight: 32, textAlign: 'center' },
  action: { minHeight: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 18, borderCurve: 'continuous', backgroundColor: actionColors.primaryBackground, paddingHorizontal: 18 },
  actionSecondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: palette.hairline },
  actionDisabled: { opacity: 0.38 },
  actionText: { fontFamily: type.semibold, color: actionColors.primaryForeground, fontSize: 15 },
  actionTextSecondary: { color: palette.ink },
  fieldHint: { fontFamily: type.regular, color: palette.inkMuted, fontSize: 13, lineHeight: 19, marginTop: -8 },
  fieldLabel: { fontFamily: type.semibold, color: palette.inkMuted, fontSize: 11, letterSpacing: 1.2, marginTop: 8 },
  previewSection: { gap: 10 },
  previewChoice: { borderWidth: 1, borderColor: palette.hairline, borderRadius: 18, borderCurve: 'continuous', padding: 16, gap: 4 },
  previewChoiceSelected: { borderColor: palette.moss, backgroundColor: palette.paperRaised },
  previewTitle: { fontFamily: type.semibold, color: palette.ink, fontSize: 15 },
  previewCopy: { fontFamily: type.regular, color: palette.inkMuted, fontSize: 13, lineHeight: 19 },
  inlineLoading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  weekdayRow: { flexDirection: 'row', gap: 6 },
  weekday: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: palette.hairline, borderRadius: 14, borderCurve: 'continuous' },
  weekdaySelected: { backgroundColor: palette.ink, borderColor: palette.ink },
  weekdayText: { fontFamily: type.semibold, color: palette.ink, fontSize: 13 },
  weekdayTextSelected: { color: '#FFFFFF' },
  timeCard: { borderWidth: 1, borderColor: palette.hairline, borderRadius: 20, borderCurve: 'continuous', padding: 14, gap: 10 },
  timeText: { fontFamily: type.semibold, color: palette.ink, fontSize: 28 },
  timePickerButton: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timeDisclosure: { fontFamily: type.regular, color: palette.inkMuted, fontSize: 28 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, backgroundColor: palette.paper },
  emptyCard: { borderWidth: 1, borderColor: palette.hairline, borderRadius: 20, borderCurve: 'continuous', padding: 18, gap: 6 },
});
