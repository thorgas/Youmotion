import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Schema from 'effect/Schema';
import {
  ANALYTICS_INSIGHT_TABS,
  ANALYTICS_TIMEFRAMES,
  APP_LOCALES,
  EMOTION_IDS,
  INSIGHT_NOTIFICATION_OWNER,
  INSIGHT_NOTIFICATION_STORAGE_KEY,
} from '@/constants';
import type { InsightBatch, InsightCandidate } from '../domain/insight-notification';
import { InsightNotificationStateSchema, initialInsightNotificationState } from '../domain/insight-notification';
import {
  loadInsightNotificationState,
  persistInsightNotificationState,
} from '../infrastructure/insight-notification.repository';
import {
  cancelInsightNotifications,
  reconcileInsightBatch,
} from '../infrastructure/insight-notification.scheduler';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => undefined),
  },
}));

jest.mock('expo-notifications', () => ({
  SchedulableTriggerInputTypes: { DATE: 'date' },
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  scheduleNotificationAsync: jest.fn(async () => 'scheduled'),
}));

const storage = jest.mocked(AsyncStorage);
const notifications = jest.mocked(Notifications);
const candidate = {
  id: `allTime:emotion:${EMOTION_IDS.JOY}`,
  timeframe: ANALYTICS_TIMEFRAMES.ALL_TIME,
  tab: ANALYTICS_INSIGHT_TABS.PATTERN,
  patternId: `emotion:${EMOTION_IDS.JOY}`,
} satisfies InsightCandidate;
const batch = {
  id: 'youmotion-insights-batch',
  fireAt: '2026-10-01T19:00:00.000Z',
  candidates: [candidate],
} satisfies InsightBatch;

describe('insight notification persistence', () => {
  beforeEach(() => jest.clearAllMocks());

  it('loads defaults when no saved state exists', async () => {
    storage.getItem.mockResolvedValueOnce(null);
    await expect(loadInsightNotificationState()).resolves.toEqual(initialInsightNotificationState());
    expect(storage.getItem).toHaveBeenCalledWith(INSIGHT_NOTIFICATION_STORAGE_KEY);
  });

  it('round-trips schema-valid state through AsyncStorage', async () => {
    const state = { ...initialInsightNotificationState(), enabled: true, dismissed: true, seen: [candidate.id] };
    storage.getItem.mockResolvedValueOnce(JSON.stringify(state));
    await expect(loadInsightNotificationState()).resolves.toEqual(state);
    await persistInsightNotificationState(state);
    expect(storage.setItem).toHaveBeenCalledWith(INSIGHT_NOTIFICATION_STORAGE_KEY, JSON.stringify(state));
  });

  it.each([
    ['malformed JSON', '{'],
    ['invalid persisted fields', JSON.stringify({ ...initialInsightNotificationState(), enabled: 'yes' })],
  ])('rejects %s at the persisted-data schema boundary', async (_description, value) => {
    storage.getItem.mockResolvedValueOnce(value);
    await expect(loadInsightNotificationState()).rejects.toBeInstanceOf(Error);
  });

  it('validates constructed state against the domain schema', () => {
    expect(Schema.is(InsightNotificationStateSchema)(initialInsightNotificationState())).toBe(true);
  });
});

describe('insight notification scheduler', () => {
  beforeEach(() => jest.clearAllMocks());

  it('schedules one owned notification with a redacted target and locale-specific copy', async () => {
    await reconcileInsightBatch({ batch, locale: APP_LOCALES.ENGLISH });
    expect(notifications.scheduleNotificationAsync).toHaveBeenCalledWith(expect.objectContaining({
      identifier: batch.id,
      content: expect.objectContaining({
        title: 'A new insight is ready',
        body: 'Open Youmotion to see your insight.',
        sound: false,
        data: expect.objectContaining({ owner: INSIGHT_NOTIFICATION_OWNER, batchId: batch.id, target: candidate }),
      }),
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(batch.fireAt) },
    }));
  });

  it('uses German copy for German locale', async () => {
    await reconcileInsightBatch({ batch, locale: APP_LOCALES.GERMAN });
    expect(notifications.scheduleNotificationAsync).toHaveBeenCalledWith(expect.objectContaining({
      content: expect.objectContaining({
        title: 'Ein neuer Einblick ist da',
        body: 'Öffne Youmotion, um deinen Einblick anzusehen.',
      }),
    }));
  });

  it('keeps a matching owned request and cancels stale owned requests without touching other owners', async () => {
    await reconcileInsightBatch({ batch, locale: APP_LOCALES.ENGLISH });
    const fingerprint = notifications.scheduleNotificationAsync.mock.calls[0]?.[0].content.data?.['fingerprint'];
    if (typeof fingerprint !== 'string') throw new Error('Scheduled insight should include its reconciliation fingerprint.');
    notifications.scheduleNotificationAsync.mockClear();
    notifications.getAllScheduledNotificationsAsync.mockResolvedValueOnce([
      {
        identifier: batch.id,
        content: { title: null, subtitle: null, body: null, categoryIdentifier: null, sound: null,
          data: { owner: INSIGHT_NOTIFICATION_OWNER, fingerprint } },
        trigger: null,
      },
      {
        identifier: 'stale-owned',
        content: { title: null, subtitle: null, body: null, categoryIdentifier: null, sound: null,
          data: { owner: INSIGHT_NOTIFICATION_OWNER, fingerprint: 'stale' } },
        trigger: null,
      },
      {
        identifier: 'other-owner',
        content: { title: null, subtitle: null, body: null, categoryIdentifier: null, sound: null,
          data: { owner: 'other' } },
        trigger: null,
      },
    ]);
    await reconcileInsightBatch({ batch, locale: APP_LOCALES.ENGLISH });
    expect(notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('stale-owned');
    expect(notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalledWith(batch.id);
    expect(notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalledWith('other-owner');
    expect(notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('cancels only this feature’s scheduled notifications and treats an empty batch as cancellation', async () => {
    notifications.getAllScheduledNotificationsAsync.mockResolvedValueOnce([
      {
        identifier: 'ours',
        content: { title: null, subtitle: null, body: null, categoryIdentifier: null, sound: null,
          data: { owner: INSIGHT_NOTIFICATION_OWNER } },
        trigger: null,
      },
      {
        identifier: 'theirs',
        content: { title: null, subtitle: null, body: null, categoryIdentifier: null, sound: null,
          data: { owner: 'other' } },
        trigger: null,
      },
    ]);
    await cancelInsightNotifications();
    expect(notifications.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(1);
    expect(notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('ours');
    await reconcileInsightBatch({ batch: null, locale: APP_LOCALES.ENGLISH });
    expect(notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
});
