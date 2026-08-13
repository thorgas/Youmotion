import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { MAX_REMINDER_TIMES } from '@/constants';
import {
  normalizedReminderSchedule,
  ReminderScheduleId,
  ReminderScheduleSchema,
  ReminderScheduleTimestamp,
} from '../domain/reminder-schedule';

const timestamp = ReminderScheduleTimestamp.make('2026-08-13T12:00:00.000Z');

const decodeSchedule = (input: unknown) => Effect.runPromise(
  Schema.decodeUnknown(ReminderScheduleSchema)(input),
);

function scheduleInput() {
  return {
    id: ReminderScheduleId.make('schedule-1'),
    schemaVersion: 1,
    name: 'Unter der Woche',
    weekdays: [5, 1, 1, 3],
    times: [
      { hour: 20, minute: 0 },
      { hour: 9, minute: 0 },
      { hour: 9, minute: 0 },
    ],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

describe('reminder schedule', () => {
  it('normalizes duplicate weekdays and times into stable wall-clock order', async () => {
    const schedule = await Effect.runPromise(
      Schema.decodeUnknown(ReminderScheduleSchema)(scheduleInput()),
    );

    expect(normalizedReminderSchedule(schedule)).toEqual({
      ...schedule,
      weekdays: [1, 3, 5],
      times: [
        { hour: 9, minute: 0 },
        { hour: 20, minute: 0 },
      ],
    });
  });

  it('rejects empty days, empty times, invalid clock values, and too many times', async () => {
    await expect(decodeSchedule({ ...scheduleInput(), weekdays: [] }))
      .rejects.toThrow('is missing');
    await expect(decodeSchedule({ ...scheduleInput(), times: [] }))
      .rejects.toThrow('is missing');
    await expect(decodeSchedule({ ...scheduleInput(), times: [{ hour: 24, minute: 0 }] }))
      .rejects.toThrow('hour');
    await expect(decodeSchedule({
      ...scheduleInput(),
      times: Array.from({ length: MAX_REMINDER_TIMES + 1 }, (_, minute) => ({
        hour: 9,
        minute,
      })),
    })).rejects.toThrow(`at most ${MAX_REMINDER_TIMES}`);
  });
});
