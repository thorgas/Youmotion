import * as Notifications from 'expo-notifications';

import {
  ANALYTICS_INSIGHT_TABS,
  ANALYTICS_TIMEFRAMES,
  INSIGHT_NOTIFICATION_EVENTS,
  INSIGHT_NOTIFICATION_OWNER,
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
  it('buffers a valid cold insight tap until binding, then routes warm taps once and rejects malformed or foreign data', () => {
    const { bindReminderNotificationActor, installReminderNotificationBridge } = jest.requireActual(
      '../infrastructure/reminder-notification.bridge',
    );
    jest.mocked(Notifications.getLastNotificationResponse).mockReturnValue(response({
      owner: INSIGHT_NOTIFICATION_OWNER,
      batchId: 'cold-insight-batch',
      target: {
        id: `${ANALYTICS_TIMEFRAMES.ALL_TIME}:emotion:freude`,
        timeframe: ANALYTICS_TIMEFRAMES.ALL_TIME,
        tab: ANALYTICS_INSIGHT_TABS.PATTERN,
        patternId: 'emotion:freude',
      },
    }));
    installReminderNotificationBridge();
    responseListener?.(response({
      owner: INSIGHT_NOTIFICATION_OWNER,
      batchId: 'cold-insight-batch',
      target: {
        id: `${ANALYTICS_TIMEFRAMES.ALL_TIME}:emotion:freude`,
        timeframe: ANALYTICS_TIMEFRAMES.ALL_TIME,
        tab: ANALYTICS_INSIGHT_TABS.PATTERN,
        patternId: 'emotion:freude',
      },
    }));
    responseListener?.(response({
      owner: 'foreign-notification-owner',
      batchId: 'foreign-batch',
      target: {
        id: `${ANALYTICS_TIMEFRAMES.ALL_TIME}:emotion:freude`,
        timeframe: ANALYTICS_TIMEFRAMES.ALL_TIME,
        tab: ANALYTICS_INSIGHT_TABS.PATTERN,
        patternId: 'emotion:freude',
      },
    }));
    responseListener?.(response({ invalid: true }));
    const actor = { send: jest.fn() };
    bindReminderNotificationActor(actor);
    expect(actor.send).toHaveBeenCalledTimes(1);
    expect(actor.send).toHaveBeenCalledWith({
      type: INSIGHT_NOTIFICATION_EVENTS.OPENED,
      target: {
        id: `${ANALYTICS_TIMEFRAMES.ALL_TIME}:emotion:freude`,
        timeframe: ANALYTICS_TIMEFRAMES.ALL_TIME,
        tab: ANALYTICS_INSIGHT_TABS.PATTERN,
        patternId: 'emotion:freude',
      },
    });

    responseListener?.(response({
      owner: INSIGHT_NOTIFICATION_OWNER,
      batchId: 'warm-insight-batch',
      target: {
        id: `${ANALYTICS_TIMEFRAMES.LAST_WEEK}:guiding-belief:always-functioning`,
        timeframe: ANALYTICS_TIMEFRAMES.LAST_WEEK,
        tab: ANALYTICS_INSIGHT_TABS.GUIDING_BELIEF,
        patternId: null,
      },
    }));
    responseListener?.(response({
      owner: INSIGHT_NOTIFICATION_OWNER,
      batchId: 'warm-insight-batch',
      target: {
        id: `${ANALYTICS_TIMEFRAMES.LAST_WEEK}:guiding-belief:always-functioning`,
        timeframe: ANALYTICS_TIMEFRAMES.LAST_WEEK,
        tab: ANALYTICS_INSIGHT_TABS.GUIDING_BELIEF,
        patternId: null,
      },
    }));
    expect(actor.send).toHaveBeenCalledTimes(2);
    expect(actor.send).toHaveBeenLastCalledWith({
      type: INSIGHT_NOTIFICATION_EVENTS.OPENED,
      target: {
        id: `${ANALYTICS_TIMEFRAMES.LAST_WEEK}:guiding-belief:always-functioning`,
        timeframe: ANALYTICS_TIMEFRAMES.LAST_WEEK,
        tab: ANALYTICS_INSIGHT_TABS.GUIDING_BELIEF,
        patternId: null,
      },
    });

    responseListener?.(response({ invalid: true }));
    responseListener?.(response({
      owner: REMINDER_NOTIFICATION_OWNER,
      assignmentId: 'assignment-1',
      fingerprint: 'one',
      targetKind: REMINDER_TARGET_KINDS.GUIDING_BELIEF,
      beliefSystemId: 'custom-support',
    }));
    expect(actor.send).toHaveBeenCalledTimes(3);
    expect(actor.send).toHaveBeenLastCalledWith({
      type: REMINDER_EVENTS.NOTIFICATION_OPENED,
      assignmentId: 'assignment-1',
      targetKind: REMINDER_TARGET_KINDS.GUIDING_BELIEF,
      beliefSystemId: 'custom-support',
    });
  });
});
