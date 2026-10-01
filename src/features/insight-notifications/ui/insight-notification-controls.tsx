import assert from '@/assert';
import * as Schema from 'effect/Schema';
import { InsightNotificationStateSchema } from '../domain/insight-notification';
import { useSelector } from '@xstate/store-react';
import { DateTimePicker, type DateTimePickerProps } from '@expo/ui/community/datetime-picker';
import { fbs } from 'fbtee';
import { PressableScale } from 'pressto';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { INSIGHT_NOTIFICATION_EVENTS, REMINDER_PERMISSION_STATES } from '@/constants';
import { Button } from '@/components/ui/button';
import { ConfirmedPickerModal } from '@/components/ui/confirmed-picker-modal';
import { useAppNavigationActor } from '@/navigation/app-navigation.provider';
import { palette, type } from '@/theme';
import { insightNotificationStore } from '@/app-stores';

const _selectNotifications = (snapshot: ReturnType<typeof insightNotificationStore.getSnapshot>) => snapshot.context;
function InsightNotificationTime() {
  const actor = useAppNavigationActor();
  const { settings, pickerOpen, busy } = useSelector(insightNotificationStore, _selectNotifications);
  assert(Schema.is(InsightNotificationStateSchema)(settings), 'Insight time picker requires valid notification preferences');
  assert(actor.getSnapshot().status === 'active', 'Insight time picker requires active navigation');
  const _open = () => actor.send({ type: INSIGHT_NOTIFICATION_EVENTS.PICKER_CHANGED, open: true });
  const _close = () => actor.send({ type: INSIGHT_NOTIFICATION_EVENTS.PICKER_CHANGED, open: false });
  const _change: NonNullable<DateTimePickerProps['onValueChange']> = (...parameters) => {
    const value = parameters[1];
    actor.send({ type: INSIGHT_NOTIFICATION_EVENTS.TIME_CHANGED, time: { hour: value.getHours(), minute: value.getMinutes() } });
  };
  const time = settings.time;
  const value = new Date(2000, 0, 1, time.hour, time.minute);
  const label = `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;
  return (
    <View>
      <PressableScale accessibilityRole="button" accessibilityLabel={String(fbs('Notification time', 'Insight notification time picker label')) + ' ' + label} disabled={busy} onPress={_open} style={styles.time} testID="insight-notification-time">
        <Text style={styles.copy}><fbt desc="Insight delivery time label">Notification time</fbt></Text>
        <Text style={styles.title}>{label}</Text>
      </PressableScale>
      {Platform.OS === 'ios' ? (
        <ConfirmedPickerModal doneLabel={String(fbs('Done', 'Confirm insight notification time'))} onDone={_close} testID="insight-notification-time-modal" title={String(fbs('Choose a time', 'Choose insight notification time'))} visible={pickerOpen}>
          <DateTimePicker accentColor={palette.moss} display="spinner" mode="time" onValueChange={_change} value={value} />
        </ConfirmedPickerModal>
      ) : pickerOpen ? <DateTimePicker mode="time" onDismiss={_close} onValueChange={_change} presentation="dialog" value={value} /> : null}
    </View>
  );
}

function NotificationButton({ label, onPress, testID, disabled = false, variant = 'primary' }: {
  label: string; onPress: () => void; testID: string; disabled?: boolean; variant?: 'primary' | 'secondary';
}) {
  return <Button.Root disabled={disabled} label={label} onPress={onPress} testID={testID} variant={variant}><Button.Text>{label}</Button.Text></Button.Root>;
}
function InsightNotificationStatus() {
  const { settings, error, permission } = useSelector(insightNotificationStore, _selectNotifications);
  assert(Schema.is(InsightNotificationStateSchema)(settings), 'Insight controls require valid notification preferences');
  assert(Object.values(REMINDER_PERMISSION_STATES).includes(permission), 'Insight controls require a supported permission state');
  const blocked = permission === REMINDER_PERMISSION_STATES.DENIED;
  return <>
    {settings.enabled ? <Text style={styles.copy}><fbt desc="Insight notifications enabled status">Insight notifications are enabled.</fbt></Text> : null}
    {blocked ? <Text style={styles.copy}><fbt desc="Insight notifications denied status">Notifications are turned off in system settings.</fbt></Text> : null}
    {error ? <Text accessibilityRole="alert" style={styles.copy}><fbt desc="Insight notification operation failed">Insight notifications could not be updated. Try again.</fbt></Text> : null}
  </>;
}

function InsightNotificationRecovery() {
  const actor = useAppNavigationActor();
  const { permission, error, busy } = useSelector(insightNotificationStore, _selectNotifications);
  assert(Object.values(REMINDER_PERMISSION_STATES).includes(permission), 'Insight recovery requires a supported permission state');
  assert(actor.getSnapshot().status === 'active', 'Insight recovery requires active navigation');
  const _settings = () => actor.send({ type: INSIGHT_NOTIFICATION_EVENTS.SYSTEM_SETTINGS_REQUESTED });
  const _recheck = () => actor.send({ type: INSIGHT_NOTIFICATION_EVENTS.RECHECK_REQUESTED });
  const blocked = permission === REMINDER_PERMISSION_STATES.DENIED;
  return <>
    {blocked ? <NotificationButton disabled={busy} label={String(fbs('Open system settings', 'Open insight notification system settings'))} onPress={_settings} variant="secondary" testID="insight-notification-system-settings" /> : null}
    {blocked || error ? <NotificationButton disabled={busy} label={String(fbs('Check again', 'Recheck insight notification permission'))} onPress={_recheck} variant="secondary" testID="insight-notification-recheck" /> : null}
  </>;
}

function InsightNotificationPreferenceTime() {
  const { hydrated, error, settings, permission } = useSelector(insightNotificationStore, _selectNotifications);
  assert(Schema.is(InsightNotificationStateSchema)(settings), 'Insight preference time requires valid stored preferences');
  assert(Object.values(REMINDER_PERMISSION_STATES).includes(permission), 'Insight preference time requires supported permission state');
  if (hydrated) return <InsightNotificationTime />;
  if (error) return null;
  return <Text style={styles.copy}><fbt desc="Insight notification loading preference">Loading notification preferences…</fbt></Text>;
}

const isOfferHidden = ({ available, hydrated, settings }: { available: boolean; hydrated: boolean; settings: typeof InsightNotificationStateSchema.Type }) => !available || !hydrated || settings.enabled || settings.dismissed;

export function InsightNotificationControls({ offer = false, available = true }: { offer?: boolean; available?: boolean }) {
  const actor = useAppNavigationActor();
  const { settings, hydrated, busy } = useSelector(insightNotificationStore, _selectNotifications);
  const _enable = () => actor.send({ type: INSIGHT_NOTIFICATION_EVENTS.ENABLED });
  const _disable = () => actor.send({ type: INSIGHT_NOTIFICATION_EVENTS.DISABLED });
  const _dismiss = () => actor.send({ type: INSIGHT_NOTIFICATION_EVENTS.DISMISSED });
  if (offer && isOfferHidden({ available, hydrated, settings })) return null;
  assert(Schema.is(InsightNotificationStateSchema)(settings), 'Insight controls require valid notification preferences');
  assert(actor.getSnapshot().status === 'active', 'Insight controls require active navigation');
  return (
    <View style={styles.card} testID={offer ? 'insight-notification-offer' : 'insight-notification-settings'}>
      <Text style={styles.title}><fbt desc="Insight notification preference title">New insights</fbt></Text>
      <Text style={styles.copy}><fbt desc="Insight notification types explanation">Receive a notification for a new guiding belief or pattern, across all three timeframes.</fbt></Text>
      <Text style={styles.copy}><fbt desc="Insight notification scheduling explanation">Insights are calculated when you open Youmotion. New insights can reach you at your chosen time, even when the app is closed.</fbt></Text>
      <InsightNotificationPreferenceTime />
      <InsightNotificationStatus />
      <NotificationButton disabled={!hydrated || busy} label={settings.enabled ? String(fbs('Deactivate notifications', 'Disable insight notifications')) : String(fbs('Activate notifications', 'Enable insight notifications'))} onPress={settings.enabled ? _disable : _enable} testID="insight-notification-toggle" />
      <InsightNotificationRecovery />
      {offer ? <NotificationButton disabled={busy} label={String(fbs('Not now', 'Dismiss insight notification offer'))} onPress={_dismiss} variant="secondary" testID="insight-notification-dismiss" /> : null}
    </View>
  );
}
const styles = StyleSheet.create({
  card: { backgroundColor: palette.paperRaised, borderWidth: 1, borderColor: palette.hairline, borderRadius: 24, padding: 18, gap: 12, marginVertical: 12 },
  title: { fontFamily: type.medium, color: palette.ink, fontSize: 18 },
  copy: { fontFamily: type.regular, color: palette.inkMuted, fontSize: 14, lineHeight: 21 },
  time: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
