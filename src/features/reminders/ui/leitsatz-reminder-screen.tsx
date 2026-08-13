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
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  NAVIGATION_EVENTS,
  MAX_REMINDER_TIMES,
  REMINDER_EVENTS,
  REMINDER_STATES,
  REMINDER_TARGET_KINDS,
} from '@/constants';
import { AppBackButton } from '@/components/ui/app-back-button';
import { ConfirmedPickerModal } from '@/components/ui/confirmed-picker-modal';
import { beliefStatementForId } from '@/features/check-in/domain/belief-statement';
import { palette, type } from '@/features/check-in/ui/theme';
import { useAppLocale } from '@/localization/app-locale-provider';
import { formatWeekday } from '@/localization/date-copy';
import { useAppNavigationActor } from '@/navigation/app-navigation.provider';
import type {
  ReminderLocalTime,
  ReminderSchedule,
  ReminderWeekday,
} from '../domain/reminder-schedule';

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
const _selectSnapshot = (snapshot: ReturnType<ReturnType<typeof useAppNavigationActor>['getSnapshot']>) => snapshot;

function ActionButton({
  label,
  onPress,
  secondary = false,
  testID,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  testID: string;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.action, secondary && styles.actionSecondary]}
      testID={testID}
    >
      <Text style={[styles.actionText, secondary && styles.actionTextSecondary]}>
        {label}
      </Text>
    </PressableScale>
  );
}

function PositiveStatementCard({ statement }: { statement: string }) {
  return (
    <View style={styles.statementCard}>
      <Text style={styles.cardEyebrow}><fbt desc="Positive Leitsatz reminder card label">YOUR NEW LEITSATZ</fbt></Text>
      <Text style={styles.statement}>“{statement}”</Text>
    </View>
  );
}

function ScheduleRow({
  locale,
  onPress,
  schedule,
}: {
  locale: string;
  onPress: () => void;
  schedule: ReminderSchedule;
}) {
  const times = schedule.times.map(({ hour, minute }) => (
    `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
  )).join(', ');
  return (
    <PressableScale
      accessibilityRole="button"
      onPress={onPress}
      style={styles.scheduleCard}
      testID={`reminder-schedule-${schedule.id}`}
    >
      <Text style={styles.scheduleTitle}>{schedule.name}</Text>
      <Text style={styles.copy}>
        {schedule.weekdays.map((weekday) => formatWeekday({ locale, weekday })).join(', ')} · {times}
      </Text>
    </PressableScale>
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
        <fbt desc="Reminder permission before schedule explanation">You can choose when the notification arrives. Youmotion will ask for notification permission before you select a schedule.</fbt>
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
          ? <fbt desc="Pulse notification permission denied explanation">No reminder schedule has been selected.</fbt>
          : <fbt desc="Leitsatz notification permission denied explanation">Your Leitsatz is saved. No reminder schedule has been selected.</fbt>}
      </Text>
      {statement ? <PositiveStatementCard statement={statement} /> : null}
      <ActionButton label={String(fbs('Open system settings', 'Open notification system settings button'))} onPress={_openSettings} testID="reminder-open-settings" />
      <ActionButton label={String(fbs('Check again', 'Recheck notification permission button'))} onPress={_checkPermission} secondary testID="reminder-check-permission" />
      <ActionButton label={String(fbs('Not now', 'Leave denied reminder flow button'))} onPress={_decline} secondary testID="reminder-permission-cancel" />
    </>
  );
}

function SchedulePickerContent({
  actor,
  error,
  locale,
  schedules,
}: {
  actor: ReminderActor;
  error: string | null;
  locale: string;
  schedules: readonly ReminderSchedule[];
}) {
  const _newSchedule = () => actor.send({ type: REMINDER_EVENTS.NEW_SCHEDULE_REQUESTED });
  return (
    <>
      <Text style={styles.eyebrow}><fbt desc="Reminder schedule picker eyebrow">NOTIFICATIONS ALLOWED</fbt></Text>
      <Text style={styles.title}><fbt desc="Reminder schedule picker title">When should it return?</fbt></Text>
      {schedules.map((schedule) => {
        const _selectSchedule = () => actor.send({
          type: REMINDER_EVENTS.SCHEDULE_SELECTED,
          scheduleId: schedule.id,
        });
        return <ScheduleRow key={schedule.id} locale={locale} onPress={_selectSchedule} schedule={schedule} />;
      })}
      {schedules.length === 0 ? <Text style={styles.copy}><fbt desc="Empty reminder schedule picker">Create your first schedule and choose its days and time.</fbt></Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <ActionButton label={String(fbs('Create new schedule', 'Create a reminder schedule button'))} onPress={_newSchedule} testID="reminder-create-schedule" />
    </>
  );
}

function ScheduleEditorContent({
  actor,
  name,
  pickerIndex,
  times,
  weekdays,
}: {
  actor: ReminderActor;
  name: string;
  pickerIndex: number | null;
  times: readonly ReminderLocalTime[];
  weekdays: readonly ReminderWeekday[];
}) {
  const _changeName = (nextName: string) => actor.send({
    type: REMINDER_EVENTS.SCHEDULE_NAME_CHANGED,
    name: nextName,
  });
  const _addTime = () => actor.send({ type: REMINDER_EVENTS.TIME_ADDED });
  const _saveSchedule = () => actor.send({ type: REMINDER_EVENTS.SCHEDULE_SAVE_REQUESTED });
  return (
    <>
      <Text style={styles.eyebrow}><fbt desc="New reminder schedule eyebrow">NEW SCHEDULE</fbt></Text>
      <Text style={styles.title}><fbt desc="New reminder schedule title">Create a rhythm that fits you.</fbt></Text>
      <TextInput aria-label={String(fbs('Schedule name', 'Reminder schedule name input label'))} onChangeText={_changeName} placeholder={String(fbs('For example: Weekday mornings', 'Reminder schedule name placeholder'))} style={styles.input} testID="reminder-schedule-name" value={name} />
      <Text style={styles.fieldLabel}><fbt desc="Reminder schedule weekdays label">DAYS</fbt></Text>
      <View style={styles.weekdayRow}>
        {reminderWeekdayOptions().map(({ label, weekday }) => {
          const selected = weekdays.includes(weekday);
          const _toggle = () => actor.send({ type: REMINDER_EVENTS.WEEKDAY_TOGGLED, weekday });
          return (
            <PressableScale accessibilityRole="button" accessibilityState={{ selected }} key={`${label}-${weekday}`} onPress={_toggle} style={[styles.weekday, selected && styles.weekdaySelected]} testID={`reminder-weekday-${weekday}`}>
              <Text style={[styles.weekdayText, selected && styles.weekdayTextSelected]}>{label}</Text>
            </PressableScale>
          );
        })}
      </View>
      <Text style={styles.fieldLabel}><fbt desc="Reminder schedule time label">TIME</fbt></Text>
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
        return <TimeRow canRemove={times.length > 1} hour={hour} index={index} key={`${hour}-${minute}`} minute={minute} onChange={_change} onDismiss={_dismiss} onOpen={_open} onRemove={_remove} pickerOpen={pickerIndex === index} />;
      })}
      {times.length < MAX_REMINDER_TIMES ? <ActionButton label={String(fbs('Add another time', 'Add reminder time button'))} onPress={_addTime} secondary testID="reminder-time-add" /> : null}
      <ActionButton label={String(fbs('Create and use schedule', 'Save and activate reminder schedule button'))} onPress={_saveSchedule} testID="reminder-save-schedule" />
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

function GuidingBeliefContent({ actor, statement }: { actor: ReminderActor; statement: string | undefined }) {
  const _openPulse = () => actor.send({ type: REMINDER_EVENTS.OPEN_PULSE_REQUESTED });
  const _editReminder = () => actor.send({ type: REMINDER_EVENTS.EDIT_REQUESTED });
  return (
    <>
      <Text style={styles.eyebrow}><fbt desc="Notification-opened Leitsatz eyebrow">YOUR LEITSATZ</fbt></Text>
      <Text style={styles.title}><fbt desc="Notification-opened Leitsatz title">A thought that may accompany you.</fbt></Text>
      {statement ? <PositiveStatementCard statement={statement} /> : <Text style={styles.copy}><fbt desc="Unavailable notification target copy">This Leitsatz is no longer available.</fbt></Text>}
      <ActionButton label={String(fbs('Open Pulse', 'Open Pulse from Leitsatz notification button'))} onPress={_openPulse} testID="reminder-open-pulse" />
      {statement ? <ActionButton label={String(fbs('Edit reminder', 'Edit Leitsatz reminder button'))} onPress={_editReminder} secondary testID="reminder-edit" /> : null}
    </>
  );
}

export function LeitsatzReminderScreen() {
  const actor = useAppNavigationActor();
  const locale = useAppLocale();
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

  if (
    snapshot.matches(REMINDER_STATES.REQUESTING_PERMISSION)
    || snapshot.matches(REMINDER_STATES.SAVING)
  ) {
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
            accessibilityLabel={String(fbs('Back', 'Reminder screen back button accessibility label'))}
            label={String(fbs('Back', 'Reminder screen back button'))}
            onPress={_back}
            testID="reminder-back"
          />
        </View>
        <ScrollView contentContainerStyle={styles.content}>
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
          {snapshot.matches(REMINDER_STATES.SCHEDULE_PICKER) ? (
            <SchedulePickerContent actor={actor} error={context.reminderError} locale={locale} schedules={context.reminderSchedules} />
          ) : null}
          {snapshot.matches(REMINDER_STATES.SCHEDULE_EDITOR) ? (
            <ScheduleEditorContent actor={actor} name={context.reminderScheduleNameDraft} pickerIndex={context.reminderTimePickerIndex} times={context.reminderTimesDraft} weekdays={context.reminderWeekdaysDraft} />
          ) : null}
          {snapshot.matches(REMINDER_STATES.ACTIVE) ? (
            <ActiveContent actor={actor} statement={statement} />
          ) : null}
          {snapshot.matches(REMINDER_STATES.GUIDING_BELIEF) ? (
            <GuidingBeliefContent actor={actor} statement={statement} />
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
  action: { minHeight: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 18, borderCurve: 'continuous', backgroundColor: palette.ink, paddingHorizontal: 18 },
  actionSecondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: palette.hairline },
  actionText: { fontFamily: type.semibold, color: '#FFFFFF', fontSize: 15 },
  actionTextSecondary: { color: palette.ink },
  scheduleCard: { minHeight: 80, justifyContent: 'center', borderWidth: 1, borderColor: palette.hairline, borderRadius: 20, borderCurve: 'continuous', padding: 18 },
  scheduleTitle: { fontFamily: type.semibold, color: palette.ink, fontSize: 17, marginBottom: 5 },
  input: { minHeight: 54, borderWidth: 1, borderColor: palette.hairline, borderRadius: 16, borderCurve: 'continuous', paddingHorizontal: 16, fontFamily: type.regular, color: palette.ink, fontSize: 16 },
  fieldLabel: { fontFamily: type.semibold, color: palette.inkMuted, fontSize: 11, letterSpacing: 1.2, marginTop: 8 },
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
});
