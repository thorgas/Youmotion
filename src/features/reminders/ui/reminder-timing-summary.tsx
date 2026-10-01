import { StyleSheet, Text } from 'react-native';
import assert from '@/assert';
import { useAppLocale } from '@/localization/app-locale-provider';
import { palette, type } from '@/theme';
import type { ReminderTiming } from '../domain/reminder-timing';

export function ReminderTimingSummary({ timing }: { timing: ReminderTiming }) {
  assert(timing.weekdays.length > 0, 'Reminder summary requires saved weekdays');
  assert(timing.times.length > 0, 'Reminder summary requires saved times');
  const locale = useAppLocale();
  const weekdayFormatter = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  const days = timing.weekdays.map((weekday) => (
    weekdayFormatter.format(new Date(2023, 0, weekday))
  )).join(', ');
  const times = timing.times.map(({ hour, minute }) => (
    `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
  )).join(', ');
  const daily = new Set(timing.weekdays).size === 7;

  return (
    <Text style={styles.summary} testID="reminder-timing-summary">
      {daily ? <fbt desc="Every day reminder schedule summary">Daily</fbt> : days}
      {' · '}{times}
    </Text>
  );
}

const styles = StyleSheet.create({
  summary: {
    fontFamily: type.semibold,
    color: palette.ink,
    fontSize: 17,
    lineHeight: 25,
    marginTop: 8,
  },
});
