import * as Notifications from 'expo-notifications';

import {
  REMINDER_NOTIFICATION_CHANNEL_ID,
  REMINDER_NOTIFICATION_OWNER,
  REMINDER_TARGET_KINDS,
} from '@/constants';
import {
  CustomBeliefSystemId,
  type BeliefStatement,
} from '@/features/check-in/domain/belief-statement';
import {
  ReminderAssignmentId,
  type ReminderAssignment,
} from '../domain/reminder-assignment';
import {
  ReminderScheduleId,
  ReminderScheduleTimestamp,
  type ReminderSchedule,
} from '../domain/reminder-schedule';
import {
  reconcileReminderNotifications,
  sendTestReminder,
} from '../infrastructure/local-reminder.scheduler';

jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 3 },
  IosAuthorizationStatus: {
    NOT_DETERMINED: 0,
    DENIED: 1,
    AUTHORIZED: 2,
    PROVISIONAL: 3,
    EPHEMERAL: 4,
  },
  SchedulableTriggerInputTypes: { TIME_INTERVAL: 'timeInterval', WEEKLY: 'weekly' },
  setNotificationChannelAsync: jest.fn(() => Promise.resolve(null)),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve([])),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('request')),
}));

const mockedNotifications = jest.mocked(Notifications);
const now = ReminderScheduleTimestamp.make('2026-08-13T12:00:00.000Z');
const beliefSystemId = CustomBeliefSystemId.make('custom-support');
const schedule = {
  id: ReminderScheduleId.make('weekday'),
  schemaVersion: 1,
  name: 'Weekdays',
  weekdays: [2, 4],
  times: [{ hour: 9, minute: 0 }, { hour: 20, minute: 0 }],
  createdAt: now,
  updatedAt: now,
} satisfies ReminderSchedule;
const assignment = {
  id: ReminderAssignmentId.make('positive'),
  schemaVersion: 1,
  scheduleId: schedule.id,
  targetKind: REMINDER_TARGET_KINDS.GUIDING_BELIEF,
  beliefSystemId,
  enabled: true,
  showFullText: false,
  createdAt: now,
  updatedAt: now,
} satisfies ReminderAssignment;
const statements = [{
  kind: 'custom',
  beliefSystemId,
  harmfulStatement: 'I must never need help.',
  guidingStatement: 'I may receive support.',
}] satisfies readonly BeliefStatement[];

describe('local reminder scheduler', () => {
  beforeEach(() => jest.clearAllMocks());

  it('projects each selected weekday and time without exposing the harmful Leidsatz', async () => {
    await reconcileReminderNotifications({
      assignments: [assignment],
      locale: 'en-US',
      schedules: [schedule],
      statements,
    });

    expect(mockedNotifications.scheduleNotificationAsync).toHaveBeenCalledTimes(4);
    const serializedCalls = JSON.stringify(
      mockedNotifications.scheduleNotificationAsync.mock.calls,
    );
    expect(serializedCalls).not.toContain('I must never need help.');
    expect(serializedCalls).not.toContain('I may receive support.');
    expect(serializedCalls).toContain(REMINDER_NOTIFICATION_OWNER);
  });

  it('keeps matching owned requests and cancels obsolete owned requests only', async () => {
    await reconcileReminderNotifications({
      assignments: [assignment],
      locale: 'en-US',
      schedules: [schedule],
      statements,
    });
    const matchingFingerprint = mockedNotifications.scheduleNotificationAsync
      .mock.calls[0]?.[0].content.data?.['fingerprint'];
    expect(typeof matchingFingerprint).toBe('string');
    mockedNotifications.scheduleNotificationAsync.mockClear();
    mockedNotifications.cancelScheduledNotificationAsync.mockClear();
    mockedNotifications.getAllScheduledNotificationsAsync.mockResolvedValueOnce([
      {
        identifier: 'matching',
        content: {
          title: null,
          subtitle: null,
          body: null,
          categoryIdentifier: null,
          sound: null,
          data: { owner: REMINDER_NOTIFICATION_OWNER, fingerprint: matchingFingerprint },
        },
        trigger: null,
      },
      {
        identifier: 'obsolete',
        content: {
          title: null,
          subtitle: null,
          body: null,
          categoryIdentifier: null,
          sound: null,
          data: { owner: REMINDER_NOTIFICATION_OWNER, fingerprint: 'obsolete' },
        },
        trigger: null,
      },
      {
        identifier: 'foreign',
        content: {
          title: null,
          subtitle: null,
          body: null,
          categoryIdentifier: null,
          sound: null,
          data: { owner: 'another-app' },
        },
        trigger: null,
      },
    ]);

    await reconcileReminderNotifications({
      assignments: [assignment],
      locale: 'en-US',
      schedules: [schedule],
      statements,
    });

    expect(mockedNotifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('obsolete');
    expect(mockedNotifications.cancelScheduledNotificationAsync).not.toHaveBeenCalledWith('matching');
    expect(mockedNotifications.cancelScheduledNotificationAsync).not.toHaveBeenCalledWith('foreign');
    expect(mockedNotifications.scheduleNotificationAsync).toHaveBeenCalledTimes(3);
  });

  it('can show the positive Leitsatz only when full previews are explicitly enabled', async () => {
    await sendTestReminder({
      assignment: { ...assignment, showFullText: true },
      locale: 'en-US',
      statements,
    });

    expect(mockedNotifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({ body: 'I may receive support.' }),
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 1,
          channelId: REMINDER_NOTIFICATION_CHANNEL_ID,
        },
      }),
    );
    expect(JSON.stringify(mockedNotifications.scheduleNotificationAsync.mock.calls))
      .not.toContain('I must never need help.');
  });
});
