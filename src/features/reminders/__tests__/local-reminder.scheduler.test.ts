import * as Notifications from 'expo-notifications';
import { PermissionStatus } from 'expo';
import { Platform } from 'react-native';

import {
  REMINDER_NOTIFICATION_CHANNEL_ID,
  REMINDER_NOTIFICATION_CONTENT,
  REMINDER_NOTIFICATION_OWNER,
  REMINDER_TARGET_KINDS,
} from '@/constants';
import {
  CustomBeliefSystemId,
  type BeliefStatement,
} from '@/features/beliefs/domain/belief-statement';
import {
  ReminderAssignmentId,
  ReminderTimestamp,
  type ReminderAssignment,
} from '../domain/reminder-assignment';
import {
  requestReminderPermission,
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
  IosAlertStyle: { BANNER: 1 },
  IosAllowsPreviews: { ALWAYS: 1 },
  SchedulableTriggerInputTypes: { TIME_INTERVAL: 'timeInterval', WEEKLY: 'weekly' },
  setNotificationChannelAsync: jest.fn(() => Promise.resolve(null)),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve([])),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('request')),
}));

const mockedNotifications = jest.mocked(Notifications);
const now = ReminderTimestamp.make('2026-08-13T12:00:00.000Z');
const beliefSystemId = CustomBeliefSystemId.make('custom-support');
const assignment = {
  id: ReminderAssignmentId.make('positive'),
  schemaVersion: 2,
  targetKind: REMINDER_TARGET_KINDS.GUIDING_BELIEF,
  beliefSystemId,
  enabled: true,
  weekdays: [2, 4],
  times: [{ hour: 9, minute: 0 }, { hour: 20, minute: 0 }],
  notificationContent: REMINDER_NOTIFICATION_CONTENT.GENERAL,
  createdAt: now,
  updatedAt: now,
} satisfies ReminderAssignment;
const checkInAssignment = {
  id: ReminderAssignmentId.make('emotion-check-in'),
  schemaVersion: 2,
  targetKind: REMINDER_TARGET_KINDS.PULSE,
  enabled: true,
  weekdays: [2, 3, 4, 5, 6],
  times: [{ hour: 19, minute: 0 }],
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
  afterEach(() => jest.restoreAllMocks());

  it('rechecks a previous iOS grant and sends a later denial to Settings', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    const iosSettings = {
      allowsDisplayInNotificationCenter: true,
      allowsDisplayOnLockScreen: true,
      allowsDisplayInCarPlay: false,
      allowsAlert: true,
      allowsBadge: false,
      allowsSound: false,
      allowsCriticalAlerts: false,
      alertStyle: Notifications.IosAlertStyle.BANNER,
      allowsPreviews: Notifications.IosAllowsPreviews.ALWAYS,
      providesAppNotificationSettings: false,
      allowsAnnouncements: false,
    };
    mockedNotifications.getPermissionsAsync
      .mockResolvedValueOnce({
        status: PermissionStatus.GRANTED,
        granted: true,
        expires: 'never',
        canAskAgain: false,
        ios: { ...iosSettings, status: Notifications.IosAuthorizationStatus.AUTHORIZED },
      })
      .mockResolvedValueOnce({
        status: PermissionStatus.DENIED,
        granted: false,
        expires: 'never',
        canAskAgain: false,
        ios: { ...iosSettings, status: Notifications.IosAuthorizationStatus.DENIED },
      });

    await expect(requestReminderPermission()).resolves.toBe('granted');
    await expect(requestReminderPermission()).resolves.toBe('denied');
    expect(mockedNotifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('asks again on Android only while the native response allows it', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    mockedNotifications.getPermissionsAsync
      .mockResolvedValueOnce({
        status: PermissionStatus.DENIED,
        granted: false,
        expires: 'never',
        canAskAgain: true,
      })
      .mockResolvedValueOnce({
        status: PermissionStatus.DENIED,
        granted: false,
        expires: 'never',
        canAskAgain: false,
      });
    mockedNotifications.requestPermissionsAsync.mockResolvedValueOnce({
      status: PermissionStatus.GRANTED,
      granted: true,
      expires: 'never',
      canAskAgain: true,
    });

    await expect(requestReminderPermission()).resolves.toBe('granted');
    await expect(requestReminderPermission()).resolves.toBe('denied');
    expect(mockedNotifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  it('projects each selected weekday and time without exposing the harmful Leidsatz', async () => {
    await reconcileReminderNotifications({
      assignments: [assignment],
      locale: 'en-US',
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
      statements,
    });

    expect(mockedNotifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('obsolete');
    expect(mockedNotifications.cancelScheduledNotificationAsync).not.toHaveBeenCalledWith('matching');
    expect(mockedNotifications.cancelScheduledNotificationAsync).not.toHaveBeenCalledWith('foreign');
    expect(mockedNotifications.scheduleNotificationAsync).toHaveBeenCalledTimes(3);
  });

  it('can show the positive Leitsatz only when full previews are explicitly enabled', async () => {
    await sendTestReminder({
      assignment: {
        ...assignment,
        notificationContent: REMINDER_NOTIFICATION_CONTENT.LEITSATZ,
      },
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

  it('invites an emotion check-in without exposing journal content', async () => {
    await sendTestReminder({
      assignment: checkInAssignment,
      locale: 'en-US',
      statements,
    });

    expect(mockedNotifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          title: 'How are you feeling?',
          body: 'Open Youmotion for a gentle emotion check-in.',
        }),
      }),
    );
    expect(JSON.stringify(mockedNotifications.scheduleNotificationAsync.mock.calls))
      .not.toContain('I must never need help.');
    expect(JSON.stringify(mockedNotifications.scheduleNotificationAsync.mock.calls))
      .not.toContain('I may receive support.');
  });

  it('localizes the emotion check-in notification in German', async () => {
    await sendTestReminder({
      assignment: checkInAssignment,
      locale: 'de-DE',
      statements,
    });

    expect(mockedNotifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          title: 'Wie fühlst du dich gerade?',
          body: 'Öffne Youmotion für einen sanften Gefühls-Check-in.',
        }),
      }),
    );
  });

  it('replaces native requests when one reminder enables a full preview', async () => {
    await reconcileReminderNotifications({
      assignments: [assignment],
      locale: 'en-US',
      statements,
    });
    const generalFingerprint = mockedNotifications.scheduleNotificationAsync
      .mock.calls[0]?.[0].content.data?.['fingerprint'];
    expect(typeof generalFingerprint).toBe('string');
    mockedNotifications.scheduleNotificationAsync.mockClear();
    mockedNotifications.getAllScheduledNotificationsAsync.mockResolvedValueOnce([{
      identifier: 'general-preview',
      content: {
        title: null,
        subtitle: null,
        body: null,
        categoryIdentifier: null,
        sound: null,
        data: { owner: REMINDER_NOTIFICATION_OWNER, fingerprint: generalFingerprint },
      },
      trigger: null,
    }]);

    await reconcileReminderNotifications({
      assignments: [{
        ...assignment,
        notificationContent: REMINDER_NOTIFICATION_CONTENT.LEITSATZ,
      }],
      locale: 'en-US',
      statements,
    });

    expect(mockedNotifications.cancelScheduledNotificationAsync)
      .toHaveBeenCalledWith('general-preview');
    expect(mockedNotifications.scheduleNotificationAsync).toHaveBeenCalledTimes(4);
    expect(mockedNotifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({ body: 'I may receive support.' }),
      }),
    );
  });
});
