import { Linking } from 'react-native';
import { getReminderPermission, requestReminderPermission } from '@/features/reminders/infrastructure/local-reminder.scheduler';
import { loadInsightNotificationState, persistInsightNotificationState } from '@/features/insight-notifications/infrastructure/insight-notification.repository';
import { reconcileInsightBatch, cancelInsightNotifications } from '@/features/insight-notifications/infrastructure/insight-notification.scheduler';
import { analyticsStore, insightNotificationStore, appSettingsStore, checkInHistoryStore } from '@/app-stores';
import { createAppNavigationMachine } from './app-navigation.machine';

import { createInsightNotificationRuntime } from '@/features/insight-notifications/application/insight-notification-runtime';

const systemNavigationRuntime = {
  insightNotifications: createInsightNotificationRuntime({ store: insightNotificationStore, deps: {
    load: loadInsightNotificationState, persist: persistInsightNotificationState,
    permission: getReminderPermission, requestPermission: requestReminderPermission,
    reconcile: reconcileInsightBatch, cancel: cancelInsightNotifications,
    now: () => new Date(), nonce: () => Math.random().toString(16).slice(2),
    openSettings: () => Linking.openSettings(),
  } }),
  analyticsStore,
  appSettingsStore,
  checkInHistoryStore,
  nonce: () => Math.random().toString(16).slice(2),
  now: () => new Date(),
};

export const appNavigationMachine = createAppNavigationMachine(systemNavigationRuntime);
