import * as Schema from 'effect/Schema';

import { MAX_REMINDER_TIMES } from '@/constants';

export const ReminderScheduleId = Schema.String.pipe(
  Schema.minLength(1),
  Schema.brand('ReminderScheduleId'),
);
export type ReminderScheduleId = typeof ReminderScheduleId.Type;

export const ReminderWeekday = Schema.Literal(1, 2, 3, 4, 5, 6, 7);
export type ReminderWeekday = typeof ReminderWeekday.Type;

export const ReminderHour = Schema.Int.pipe(Schema.between(0, 23));
export const ReminderMinute = Schema.Int.pipe(Schema.between(0, 59));

export const ReminderLocalTime = Schema.Struct({
  hour: ReminderHour,
  minute: ReminderMinute,
});
export type ReminderLocalTime = typeof ReminderLocalTime.Type;

export const ReminderScheduleTimestamp = Schema.String.pipe(
  Schema.minLength(1),
  Schema.brand('ReminderScheduleTimestamp'),
);
export type ReminderScheduleTimestamp = typeof ReminderScheduleTimestamp.Type;

export const ReminderScheduleSchema = Schema.Struct({
  id: ReminderScheduleId,
  schemaVersion: Schema.Literal(1),
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(80)),
  weekdays: Schema.NonEmptyArray(ReminderWeekday),
  times: Schema.NonEmptyArray(ReminderLocalTime).pipe(
    Schema.maxItems(MAX_REMINDER_TIMES),
  ),
  createdAt: ReminderScheduleTimestamp,
  updatedAt: ReminderScheduleTimestamp,
});
export type ReminderSchedule = typeof ReminderScheduleSchema.Type;

export const ReminderScheduleListSchema = Schema.Array(ReminderScheduleSchema);

export function normalizedReminderSchedule(
  schedule: ReminderSchedule,
): ReminderSchedule {
  // oxlint-disable-next-line unicorn/no-array-sort -- Hermes lacks toSorted; this receiver is a fresh copy.
  const weekdays = [...new Set(schedule.weekdays)].sort((left, right) => left - right);
  const times = [...schedule.times]
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
  if (!firstWeekday || !firstTime) return schedule;
  return {
    ...schedule,
    weekdays: [firstWeekday, ...remainingWeekdays],
    times: [firstTime, ...remainingTimes],
  };
}

export function createReminderScheduleId({
  nonce,
  timestamp,
}: {
  nonce: string;
  timestamp: number;
}) {
  return ReminderScheduleId.make(`schedule-${timestamp}-${nonce}`);
}
