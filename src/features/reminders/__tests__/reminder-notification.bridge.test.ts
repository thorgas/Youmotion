import * as Notifications from 'expo-notifications';

import {
  REMINDER_EVENTS,
  REMINDER_NOTIFICATION_OWNER,
  REMINDER_TARGET_KINDS,
} from '@/constants';

let responseListener: ((response: Notifications.NotificationResponse) => void) | undefined;

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getLastNotificationResponse: jest.fn(() => null),
  addNotificationResponseReceivedListener: jest.fn((listener) => {
    responseListener = listener;
    return { remove: jest.fn() };
  }),
}));

function response(data: Record<string, unknown>) {
  return {
    actionIdentifier: 'default',
    notification: {
      date: Date.now(),
      request: {
        identifier: 'request',
        trigger: null,
        content: {
          title: null,
          subtitle: null,
          body: null,
          sound: null,
          categoryIdentifier: '',
          data,
        },
      },
    },
  };
}

describe('reminder notification bridge', () => {
  it('buffers one validated cold-start target and ignores malformed or duplicate responses', () => {
    const { bindReminderNotificationActor, installReminderNotificationBridge } = jest.requireActual(
      '../infrastructure/reminder-notification.bridge',
    );
    installReminderNotificationBridge();
    responseListener?.(response({ invalid: true }));
    responseListener?.(response({
      owner: REMINDER_NOTIFICATION_OWNER,
      assignmentId: 'assignment-1',
      fingerprint: 'one',
      targetKind: REMINDER_TARGET_KINDS.GUIDING_BELIEF,
      beliefSystemId: 'custom-support',
    }));
    const actor = { send: jest.fn() };
    bindReminderNotificationActor(actor);
    responseListener?.(response({
      owner: REMINDER_NOTIFICATION_OWNER,
      assignmentId: 'assignment-1',
      fingerprint: 'one',
      targetKind: REMINDER_TARGET_KINDS.GUIDING_BELIEF,
      beliefSystemId: 'custom-support',
    }));

    expect(actor.send).toHaveBeenCalledTimes(1);
    expect(actor.send).toHaveBeenCalledWith({
      type: REMINDER_EVENTS.NOTIFICATION_OPENED,
      assignmentId: 'assignment-1',
      targetKind: REMINDER_TARGET_KINDS.GUIDING_BELIEF,
      beliefSystemId: 'custom-support',
    });
  });
});
