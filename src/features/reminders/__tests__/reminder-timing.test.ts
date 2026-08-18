import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { MAX_REMINDER_TIMES } from '@/constants';
import {
  normalizedReminderTiming,
  ReminderTimingSchema,
} from '../domain/reminder-timing';

describe('reminder timing', () => {
  it('sorts and deduplicates days and local times', async () => {
    const timing = await Effect.runPromise(Schema.decodeUnknown(ReminderTimingSchema)({
      weekdays: [6, 2, 2],
      times: [
        { hour: 18, minute: 0 },
        { hour: 9, minute: 30 },
        { hour: 9, minute: 30 },
      ],
    }));

    expect(normalizedReminderTiming(timing)).toEqual({
      weekdays: [2, 6],
      times: [{ hour: 9, minute: 30 }, { hour: 18, minute: 0 }],
    });
  });

  it('rejects empty timing and more than the supported number of times', async () => {
    await expect(Effect.runPromise(Schema.decodeUnknown(ReminderTimingSchema)({
      weekdays: [],
      times: [],
    }))).rejects.toThrow('is missing');
    await expect(Effect.runPromise(Schema.decodeUnknown(ReminderTimingSchema)({
      weekdays: [2],
      times: Array.from({ length: MAX_REMINDER_TIMES + 1 }, (_, minute) => ({
        hour: 9,
        minute,
      })),
    }))).rejects.toThrow(`at most ${MAX_REMINDER_TIMES}`);
  });
});
