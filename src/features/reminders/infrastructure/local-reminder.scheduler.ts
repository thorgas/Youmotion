import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import {
  APP_LOCALES,
  REMINDER_NOTIFICATION_CHANNEL_ID,
  REMINDER_NOTIFICATION_OWNER,
  REMINDER_PERMISSION_STATES,
  REMINDER_TARGET_KINDS,
} from '@/constants';
import type { BeliefStatement } from '@/features/check-in/domain/belief-statement';
import type { ReminderAssignment } from '../domain/reminder-assignment';
import type { ReminderSchedule } from '../domain/reminder-schedule';

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
  return permissionState(await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: false },
  }));
}

function statementForAssignment({
  assignment,
  statements,
}: {
  assignment: ReminderAssignment;
  statements: readonly BeliefStatement[];
}) {
  if (assignment.targetKind !== REMINDER_TARGET_KINDS.GUIDING_BELIEF) return undefined;
  const statement = statements.find((candidate) => (
    candidate.beliefSystemId === assignment.beliefSystemId
    && candidate.guidingStatement !== undefined
    && candidate.guidingStatement.length > 0
    && (candidate.kind === 'built-in' || candidate.archivedAt === undefined)
  ));
  return statement?.guidingStatement;
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
      title: locale === APP_LOCALES.GERMAN ? 'Ein Moment für dich' : 'A moment for you',
      body: locale === APP_LOCALES.GERMAN
        ? 'Öffne Youmotion, wenn du bereit bist wahrzunehmen, was gerade da ist.'
        : 'Open Youmotion when you are ready to notice what is here.',
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
    body: assignment.showFullText
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
  return (hash >>> 0).toString(36);
}

function fingerprint({
  assignment,
  schedule,
  weekday,
  hour,
  minute,
  locale,
  statements,
  timeZone,
}: {
  assignment: ReminderAssignment;
  schedule: ReminderSchedule;
  weekday: number;
  hour: number;
  minute: number;
  locale: string;
  statements: readonly BeliefStatement[];
  timeZone: string;
}) {
  const belief = assignment.targetKind === REMINDER_TARGET_KINDS.GUIDING_BELIEF
    ? assignment.beliefSystemId
    : '-';
  const contentIdentity = assignment.targetKind === REMINDER_TARGET_KINDS.GUIDING_BELIEF
    ? `${assignment.showFullText ? 'full' : 'general'}-${textFingerprint(
        statementForAssignment({ assignment, statements }) ?? '',
      )}`
    : '-';
  return [assignment.id, schedule.id, assignment.targetKind, belief, contentIdentity, weekday, hour, minute, locale, timeZone, 1]
    .join(':');
}

type ExpectedNotification = {
  content: Notifications.NotificationContentInput;
  trigger: Notifications.WeeklyTriggerInput;
};

function expectedNotificationsForAssignment({
  assignment,
  locale,
  schedule,
  statements,
  timeZone,
}: {
  assignment: ReminderAssignment;
  locale: string;
  schedule: ReminderSchedule;
  statements: readonly BeliefStatement[];
  timeZone: string;
}) {
  return schedule.weekdays.flatMap((weekday) => schedule.times.flatMap((time) => {
    const key = fingerprint({
      assignment,
      schedule,
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
  schedules,
  statements,
  timeZone,
}: {
  assignments: readonly ReminderAssignment[];
  locale: string;
  schedules: readonly ReminderSchedule[];
  statements: readonly BeliefStatement[];
  timeZone: string;
}) {
  const entries = assignments.flatMap((assignment) => {
    if (!assignment.enabled) return [];
    const schedule = schedules.find((candidate) => candidate.id === assignment.scheduleId);
    return schedule ? expectedNotificationsForAssignment({
      assignment,
      locale,
      schedule,
      statements,
      timeZone,
    }) : [];
  });
  return new Map<string, ExpectedNotification>(entries);
}

function reconcileActions({
  expected,
  scheduled,
}: {
  expected: ReadonlyMap<string, ExpectedNotification>;
  scheduled: readonly Notifications.NotificationRequest[];
}) {
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
  return { cancelIdentifiers, scheduleRequests };
}

export async function reconcileReminderNotifications({
  assignments,
  locale,
  schedules,
  statements,
}: {
  assignments: readonly ReminderAssignment[];
  locale: string;
  schedules: readonly ReminderSchedule[];
  statements: readonly BeliefStatement[];
}) {
  await ensureReminderChannel();
  const timeZone = `${Intl.DateTimeFormat().resolvedOptions().timeZone}:${new Date().getTimezoneOffset()}`;
  const expected = expectedNotifications({
    assignments,
    locale,
    schedules,
    statements,
    timeZone,
  });
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const { cancelIdentifiers, scheduleRequests } = reconcileActions({ expected, scheduled });
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
