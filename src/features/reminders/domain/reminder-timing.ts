import * as Schema from 'effect/Schema';
import assert from '@/assert';

import { MAX_REMINDER_TIMES } from '@/constants';

export const ReminderWeekday = Schema.Literal(1, 2, 3, 4, 5, 6, 7);
export type ReminderWeekday = typeof ReminderWeekday.Type;

export const ReminderHour = Schema.Int.pipe(Schema.between(0, 23));
export const ReminderMinute = Schema.Int.pipe(Schema.between(0, 59));

export const ReminderLocalTime = Schema.Struct({
  hour: ReminderHour,
  minute: ReminderMinute,
});
export type ReminderLocalTime = typeof ReminderLocalTime.Type;

export const ReminderTimingSchema = Schema.Struct({
  weekdays: Schema.NonEmptyArray(ReminderWeekday),
  times: Schema.NonEmptyArray(ReminderLocalTime).pipe(
    Schema.maxItems(MAX_REMINDER_TIMES),
  ),
});
export type ReminderTiming = typeof ReminderTimingSchema.Type;

export function normalizedReminderTiming(timing: ReminderTiming): ReminderTiming {
  assert(timing.weekdays.length > 0, 'Reminder timing requires a weekday');
  assert(timing.times.length > 0, 'Reminder timing requires a time');
  // oxlint-disable-next-line unicorn/no-array-sort -- Hermes lacks toSorted; this receiver is a fresh copy.
  const weekdays = [...new Set(timing.weekdays)].sort((left, right) => left - right);
  const times = [...timing.times]
    // oxlint-disable-next-line unicorn/no-array-sort -- Hermes lacks toSorted; this receiver is a fresh copy.
    .sort((left, right) => (
      left.hour === right.hour
        ? left.minute - right.minute
        : left.hour - right.hour
    ))
    .filter((time, index, all) => (
      index === 0
      || time.hour !== all[index - 1]?.hour
      || time.minute !== all[index - 1]?.minute
    ));

  const [firstWeekday, ...remainingWeekdays] = weekdays;
  const [firstTime, ...remainingTimes] = times;
  if (!firstWeekday || !firstTime) return timing;
  const normalized: ReminderTiming = {
    weekdays: [firstWeekday, ...remainingWeekdays],
    times: [firstTime, ...remainingTimes],
  };
  assert(normalized.weekdays.length <= timing.weekdays.length, 'Normalization cannot add weekdays');
  assert(normalized.times.length <= timing.times.length, 'Normalization cannot add times');
  return normalized;
}
