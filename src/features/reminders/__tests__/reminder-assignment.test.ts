import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import {
  BELIEF_SYSTEM_IDS,
  REMINDER_NOTIFICATION_CONTENT,
  REMINDER_TARGET_KINDS,
} from '@/constants';
import {
  ReminderAssignmentId,
  ReminderAssignmentSchema,
  ReminderTimestamp,
} from '../domain/reminder-assignment';

const timestamp = ReminderTimestamp.make('2026-08-18T10:00:00.000Z');

describe('ReminderAssignmentSchema', () => {
  it('decodes a Leitsatz reminder with timing and an explicit content choice', async () => {
    const reminder = {
      id: ReminderAssignmentId.make('leitsatz-reminder'),
      schemaVersion: 2,
      targetKind: REMINDER_TARGET_KINDS.GUIDING_BELIEF,
      beliefSystemId: BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING,
      enabled: true,
      weekdays: [1, 3, 5],
      times: [{ hour: 9, minute: 30 }],
      notificationContent: REMINDER_NOTIFICATION_CONTENT.LEITSATZ,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await expect(Effect.runPromise(
      Schema.decodeUnknown(ReminderAssignmentSchema)(reminder),
    )).resolves.toEqual(reminder);
  });

  it('rejects the legacy schedule reference and preview boolean model', async () => {
    await expect(Effect.runPromise(
      Schema.decodeUnknown(ReminderAssignmentSchema)({
        id: 'legacy-reminder',
        schemaVersion: 1,
        scheduleId: 'shared-schedule',
        targetKind: REMINDER_TARGET_KINDS.GUIDING_BELIEF,
        beliefSystemId: 'support',
        enabled: true,
        showFullText: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      }),
    )).rejects.toThrow('schemaVersion');
  });
});
