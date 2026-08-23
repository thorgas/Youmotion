import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import assert from '@/assert';

import {
  APP_LOCALES,
  REMINDER_NOTIFICATION_CHANNEL_ID,
  REMINDER_NOTIFICATION_CONTENT,
  REMINDER_NOTIFICATION_OWNER,
  REMINDER_PERMISSION_STATES,
  REMINDER_TARGET_KINDS,
} from '@/constants';
import type { BeliefStatement } from '@/features/check-in/domain/belief-statement';
import type { ReminderAssignment } from '../domain/reminder-assignment';

export type ReminderPermissionState = typeof REMINDER_PERMISSION_STATES[
  keyof typeof REMINDER_PERMISSION_STATES
];

export type ReminderNotificationData = {
  owner: typeof REMINDER_NOTIFICATION_OWNER;
  fingerprint: string;
  assignmentId: string;
  targetKind: typeof REMINDER_TARGET_KINDS[keyof typeof REMINDER_TARGET_KINDS];
  beliefSystemId?: string;
};

export async function ensureReminderChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(REMINDER_NOTIFICATION_CHANNEL_ID, {
    name: 'Gentle reminders',
    description: 'Private reminders for your Pulse and positive Leitsätze.',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 180],
    enableVibrate: true,
    sound: null,
  });
}

function permissionState(
  permission: Notifications.NotificationPermissionsStatus,
): ReminderPermissionState {
  assert(permission.status !== undefined, 'Native permission status must be present');
  assert(permission.expires !== undefined, 'Native permission expiry must be present');
  if (Platform.OS === 'ios') {
    const status = permission.ios?.status;
    if (
      status === Notifications.IosAuthorizationStatus.AUTHORIZED
      || status === Notifications.IosAuthorizationStatus.PROVISIONAL
      || status === Notifications.IosAuthorizationStatus.EPHEMERAL
    ) return REMINDER_PERMISSION_STATES.GRANTED;
    return status === Notifications.IosAuthorizationStatus.NOT_DETERMINED
      ? REMINDER_PERMISSION_STATES.UNDETERMINED
      : REMINDER_PERMISSION_STATES.DENIED;
  }
  if (permission.granted) {
    return REMINDER_PERMISSION_STATES.GRANTED;
  }
  return permission.canAskAgain
    ? REMINDER_PERMISSION_STATES.UNDETERMINED
    : REMINDER_PERMISSION_STATES.DENIED;
}

export async function getReminderPermission() {
  await ensureReminderChannel();
  return permissionState(await Notifications.getPermissionsAsync());
}

export async function requestReminderPermission() {
  const current = await getReminderPermission();
  if (current === REMINDER_PERMISSION_STATES.GRANTED) return current;
  if (current === REMINDER_PERMISSION_STATES.DENIED) return current;
  assert(current === REMINDER_PERMISSION_STATES.UNDETERMINED, 'Only an undetermined permission may prompt');
  const requested = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: false },
  });
  assert(requested.status !== undefined, 'Native permission prompt must return a status');
  return permissionState(requested);
}

function statementForAssignment({
  assignment,
  statements,
}: {
  assignment: ReminderAssignment;
  statements: readonly BeliefStatement[];
}) {
  assert(assignment.id.length > 0, 'Reminder assignment id must not be empty');
  assert(assignment.targetKind === REMINDER_TARGET_KINDS.GUIDING_BELIEF || assignment.targetKind === REMINDER_TARGET_KINDS.PULSE, 'Reminder target must be supported');
  if (assignment.targetKind !== REMINDER_TARGET_KINDS.GUIDING_BELIEF) return undefined;
  const statement = statements.find((candidate) => (
    candidate.beliefSystemId === assignment.beliefSystemId
    && candidate.guidingStatement !== undefined
    && candidate.guidingStatement.length > 0
    && (candidate.kind === 'built-in' || candidate.archivedAt === undefined)
  ));
  const guidingStatement = statement?.guidingStatement;
  assert(guidingStatement === undefined || guidingStatement.length > 0, 'Matched guiding copy must not be empty');
  assert(statement === undefined || statement.beliefSystemId === assignment.beliefSystemId, 'Matched statement must belong to the reminder target');
  return guidingStatement;
}

function notificationContent({
  assignment,
  notificationFingerprint,
  locale,
  statements,
}: {
  assignment: ReminderAssignment;
  notificationFingerprint: string;
  locale: string;
  statements: readonly BeliefStatement[];
}): Notifications.NotificationContentInput | null {
  assert(notificationFingerprint.length > 0, 'Notification fingerprint must not be empty');
  assert(assignment.id.length > 0, 'Notification assignment id must not be empty');
  const data: ReminderNotificationData = assignment.targetKind === REMINDER_TARGET_KINDS.PULSE
    ? {
        owner: REMINDER_NOTIFICATION_OWNER,
        fingerprint: notificationFingerprint,
        assignmentId: assignment.id,
        targetKind: assignment.targetKind,
      }
    : {
        owner: REMINDER_NOTIFICATION_OWNER,
        fingerprint: notificationFingerprint,
        assignmentId: assignment.id,
        targetKind: assignment.targetKind,
        beliefSystemId: assignment.beliefSystemId,
      };
  if (assignment.targetKind === REMINDER_TARGET_KINDS.PULSE) {
    return {
      title: locale === APP_LOCALES.GERMAN ? 'Wie fühlst du dich gerade?' : 'How are you feeling?',
      body: locale === APP_LOCALES.GERMAN
        ? 'Öffne Youmotion für einen sanften Gefühls-Check-in.'
        : 'Open Youmotion for a gentle emotion check-in.',
      data,
      sound: false,
    };
  }
  const guidingStatement = statementForAssignment({ assignment, statements });
  if (!guidingStatement) return null;
  return {
    title: locale === APP_LOCALES.GERMAN
      ? 'Dein Leitsatz ist für dich da'
      : 'Your Leitsatz is here for you',
    body: assignment.notificationContent === REMINDER_NOTIFICATION_CONTENT.LEITSATZ
      ? guidingStatement
      : locale === APP_LOCALES.GERMAN
        ? 'Öffne Youmotion, wenn es sich richtig anfühlt.'
        : 'Open Youmotion when it feels right.',
    data,
    sound: false,
  };
}

function textFingerprint(value: string) {
  let hash = 2_166_136_261;
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16_777_619);
  }
  const encoded = (hash >>> 0).toString(36);
  assert(encoded.length > 0, 'Text fingerprint must not be empty');
  assert(/^[0-9a-z]+$/.test(encoded), 'Text fingerprint must be base36');
  return encoded;
}

function fingerprint({
  assignment,
  weekday,
  hour,
  minute,
  locale,
  statements,
  timeZone,
}: {
  assignment: ReminderAssignment;
  weekday: number;
  hour: number;
  minute: number;
  locale: string;
  statements: readonly BeliefStatement[];
  timeZone: string;
}) {
  assert(weekday >= 1 && weekday <= 7, 'Notification weekday must be in the weekly trigger range');
  assert(hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59, 'Notification time must be valid');
  const belief = assignment.targetKind === REMINDER_TARGET_KINDS.GUIDING_BELIEF
    ? assignment.beliefSystemId
    : '-';
  const contentIdentity = assignment.targetKind === REMINDER_TARGET_KINDS.GUIDING_BELIEF
    ? `${assignment.notificationContent}-${textFingerprint(
        statementForAssignment({ assignment, statements }) ?? '',
      )}`
    : '-';
  const value = [assignment.id, assignment.targetKind, belief, contentIdentity, weekday, hour, minute, locale, timeZone, 2]
    .join(':');
  assert(value.includes(assignment.id), 'Fingerprint must identify its assignment');
  assert(value.includes(timeZone), 'Fingerprint must identify its timezone');
  return value;
}

type ExpectedNotification = {
  content: Notifications.NotificationContentInput;
  trigger: Notifications.WeeklyTriggerInput;
};

function expectedNotificationsForAssignment({
  assignment,
  locale,
  statements,
  timeZone,
}: {
  assignment: ReminderAssignment;
  locale: string;
  statements: readonly BeliefStatement[];
  timeZone: string;
}) {
  return assignment.weekdays.flatMap((weekday) => assignment.times.flatMap((time) => {
    assert(weekday >= 1 && weekday <= 7, 'Scheduled weekday must be valid');
    assert(time.hour >= 0 && time.hour <= 23 && time.minute >= 0 && time.minute <= 59, 'Scheduled local time must be valid');
    const key = fingerprint({
      assignment,
      weekday,
      hour: time.hour,
      minute: time.minute,
      locale,
      statements,
      timeZone,
    });
    const content = notificationContent({
      assignment,
      notificationFingerprint: key,
      locale,
      statements,
    });
    if (!content) return [];
    const entry: [string, ExpectedNotification] = [key, {
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday,
        hour: time.hour,
        minute: time.minute,
        channelId: REMINDER_NOTIFICATION_CHANNEL_ID,
      },
    }];
    return [entry];
  }));
}

function expectedNotifications({
  assignments,
  locale,
  statements,
  timeZone,
}: {
  assignments: readonly ReminderAssignment[];
  locale: string;
  statements: readonly BeliefStatement[];
  timeZone: string;
}) {
  assert(assignments.every((assignment) => assignment.weekdays.length > 0), 'Every reminder must have weekdays');
  assert(assignments.every((assignment) => assignment.times.length > 0), 'Every reminder must have times');
  const entries = assignments.flatMap((assignment) => {
    if (!assignment.enabled) return [];
    return expectedNotificationsForAssignment({
      assignment,
      locale,
      statements,
      timeZone,
    });
  });
  const notifications = new Map<string, ExpectedNotification>(entries);
  assert(notifications.size <= entries.length, 'Notification map cannot exceed generated entries');
  assert([...notifications.keys()].every((key) => key.length > 0), 'Notification keys must not be empty');
  return notifications;
}

function reconcileActions({
  expected,
  scheduled,
}: {
  expected: ReadonlyMap<string, ExpectedNotification>;
  scheduled: readonly Notifications.NotificationRequest[];
}) {
  assert([...expected.keys()].every((key) => key.length > 0), 'Expected notification keys must not be empty');
  assert(scheduled.every((request) => request.identifier.length > 0), 'Scheduled notification identifiers must not be empty');
  const existing = new Set<string>();
  const cancelIdentifiers: string[] = [];
  for (const request of scheduled) {
    const data = request.content.data;
    if (data?.['owner'] !== REMINDER_NOTIFICATION_OWNER) continue;
    const key = data['fingerprint'];
    if (typeof key === 'string' && expected.has(key) && !existing.has(key)) {
      existing.add(key);
    } else {
      cancelIdentifiers.push(request.identifier);
    }
  }
  const scheduleRequests: ExpectedNotification[] = [];
  for (const [key, request] of expected) {
    if (!existing.has(key)) scheduleRequests.push(request);
  }
  assert(cancelIdentifiers.every((identifier) => !existing.has(identifier)), 'Cancelled identifiers cannot be expected fingerprints');
  assert(scheduleRequests.length <= expected.size, 'Schedule requests cannot exceed expected notifications');
  return { cancelIdentifiers, scheduleRequests };
}

export async function reconcileReminderNotifications({
  assignments,
  locale,
  statements,
}: {
  assignments: readonly ReminderAssignment[];
  locale: string;
  statements: readonly BeliefStatement[];
}) {
  assert(assignments.every((assignment) => assignment.id.length > 0), 'Reconciled assignments must have ids');
  assert(locale.length > 0, 'Reminder locale must not be empty');
  await ensureReminderChannel();
  const timeZone = `${Intl.DateTimeFormat().resolvedOptions().timeZone}:${new Date().getTimezoneOffset()}`;
  const expected = expectedNotifications({
    assignments,
    locale,
    statements,
    timeZone,
  });
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const { cancelIdentifiers, scheduleRequests } = reconcileActions({ expected, scheduled });
  assert(cancelIdentifiers.length <= scheduled.length, 'Cancellation count cannot exceed scheduled notifications');
  assert(scheduleRequests.length <= expected.size, 'Schedule count cannot exceed expected notifications');
  await Promise.all(cancelIdentifiers.map((identifier) => (
    Notifications.cancelScheduledNotificationAsync(identifier)
  )));
  await Promise.all(scheduleRequests.map((request) => (
    Notifications.scheduleNotificationAsync(request)
  )));
}

export async function sendTestReminder({
  assignment,
  locale,
  statements,
}: {
  assignment: ReminderAssignment;
  locale: string;
  statements: readonly BeliefStatement[];
}) {
  assert(assignment.id.length > 0, 'Test reminder assignment id must not be empty');
  assert(locale.length > 0, 'Test reminder locale must not be empty');
  const content = notificationContent({
    assignment,
    notificationFingerprint: `test:${assignment.id}`,
    locale,
    statements,
  });
  if (!content) return false;
  await Notifications.scheduleNotificationAsync({
    content,
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 1,
      channelId: REMINDER_NOTIFICATION_CHANNEL_ID,
    },
  });
  return true;
}
