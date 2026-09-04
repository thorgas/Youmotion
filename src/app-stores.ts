import { createAnalyticsStore } from '@/features/analytics/application/analytics.store';
import { createCheckInHistoryStore } from '@/features/history/application/check-in-history.store';
import { createHistoryTimeframeStore } from '@/features/history/application/history-timeframe.store';
import { createAppSettingsStore } from '@/features/settings/application/app-settings.store';

export const analyticsStore = createAnalyticsStore();
export const appSettingsStore = createAppSettingsStore();
export const checkInHistoryStore = createCheckInHistoryStore();
export const historyTimeframeStore = createHistoryTimeframeStore();
