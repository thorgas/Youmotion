import { afterEach, describe, expect, mock, requireActual, render, resetModules, test, waitUntil } from 'react-native-harness';
import { screen, userEvent } from '@react-native-harness/ui';
import { Platform, ScrollView, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { File, Paths } from 'expo-file-system';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { APP_LOCALES, INSIGHT_NOTIFICATION_EVENTS, INSIGHT_NOTIFICATION_OWNER, INSIGHT_NOTIFICATION_STORAGE_KEY } from '@/constants';
import { PersistedDataArchiveSchema, currentDataArchive } from '@/features/data-safety/domain/data-archive';
import legacyArchive from '@/features/data-safety/__tests__/fixtures/legacy-archive.fixture.json';
import { initialInsightNotificationState, insightCandidates } from '../domain/insight-notification';
import { findLaidOutByTestId, pressLaidOutUntil } from '@/testing/harness-ui';
import type { InsightNotificationCoordinator, InsightNotificationCommand } from '../application/insight-notification-coordinator';

let activeCoordinator: InsightNotificationCoordinator | undefined;
function currentCoordinator() {
  if (!activeCoordinator) throw new Error('Insight Harness coordinator is not ready.');
  return activeCoordinator;
}

let sentinelIdentifier: string | undefined;
let savedPreferences: string | null = null;

async function captureEvidence(name: string) {
  const screenshot = await screen.screenshot();
  if (!screenshot) throw new Error('Insight screenshot is required.');
  const file = new File(Paths.cache, `insight-notification-${name}.png`);
  file.create({ overwrite: true });
  file.write(screenshot.data);
  console.log(`INSIGHT_EVIDENCE ${file.uri}`);
}

async function press(testID: string) {
  await userEvent.press(await findLaidOutByTestId(testID));
}

afterEach(async () => {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(scheduled.filter((request) => request.identifier.startsWith('insight-harness-') || request.identifier.endsWith('-native-harness'))
    .map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier)));
  if (sentinelIdentifier) await Notifications.cancelScheduledNotificationAsync(sentinelIdentifier);
  sentinelIdentifier = undefined;
  if (savedPreferences === null) await AsyncStorage.removeItem(INSIGHT_NOTIFICATION_STORAGE_KEY);
  else await AsyncStorage.setItem(INSIGHT_NOTIFICATION_STORAGE_KEY, savedPreferences);
  activeCoordinator = undefined;
  resetModules();
});

describe('native insight notification preferences and delivery registration', () => {
  for (const locale of [APP_LOCALES.GERMAN, APP_LOCALES.ENGLISH]) {
    test(`persists, schedules once, and disables without cancelling unrelated alerts in ${locale}`, async () => {
      savedPreferences = await AsyncStorage.getItem(INSIGHT_NOTIFICATION_STORAGE_KEY);
      const archive = currentDataArchive(await Effect.runPromise(Schema.decodeUnknown(PersistedDataArchiveSchema)(legacyArchive)));
      expect(archive.checkIns.length).toBe(133);
      expect(archive.beliefStatements.length).toBe(15);
      const repository: typeof import('../infrastructure/insight-notification.repository') = require('../infrastructure/insight-notification.repository');
      const scheduler: typeof import('../infrastructure/insight-notification.scheduler') = require('../infrastructure/insight-notification.scheduler');
      const permission: typeof import('@/features/reminders/infrastructure/local-reminder.scheduler') = require('@/features/reminders/infrastructure/local-reminder.scheduler');
      await repository.persistInsightNotificationState(initialInsightNotificationState());
      expect(await repository.loadInsightNotificationState()).toEqual(initialInsightNotificationState());
      const { insightNotificationStore, appSettingsStore }: typeof import('@/app-stores') = require('@/app-stores');
      appSettingsStore.trigger.hydrated({ settings: { ...archive.settings, locale } });
      insightNotificationStore.trigger.updated({ settings: initialInsightNotificationState() });
      insightNotificationStore.trigger.pickerChanged({ open: false });
      const { InsightNotificationCoordinator }: typeof import('../application/insight-notification-coordinator') = require('../application/insight-notification-coordinator');
      const now = new Date();
      const coordinator = new InsightNotificationCoordinator({
        store: insightNotificationStore,
        deps: {
          load: repository.loadInsightNotificationState, persist: repository.persistInsightNotificationState,
          permission: permission.getReminderPermission, requestPermission: permission.requestReminderPermission,
          reconcile: scheduler.reconcileInsightBatch, cancel: scheduler.cancelInsightNotifications,
          now: () => now, nonce: () => 'native-harness', openSettings: () => Promise.resolve(),
        },
      });
      activeCoordinator = coordinator;
      mock('react-native', () => {
        const actual: typeof import('react-native') = requireActual('react-native');
        const react: typeof import('react') = require('react');
        const mocked = Object.create(Object.getPrototypeOf(actual), Object.getOwnPropertyDescriptors(actual));
        Object.defineProperty(mocked, 'Modal', {
          configurable: true,
          value: ({ children, visible }: import('react-native').ModalProps) => visible ? react.createElement(react.Fragment, null, children) : null,
        });
        return mocked;
      });
      mock('@/navigation/app-navigation.provider', () => ({
        useAppNavigationActor: () => ({
          send: (event: InsightNotificationCommand) => { void currentCoordinator().command(event); },
          getSnapshot: () => ({ status: 'active' }),
        }),
      }));
      const { AppLocaleProvider }: typeof import('@/localization/app-locale-provider') = require('@/localization/app-locale-provider');
      const { InsightNotificationControls }: typeof import('../ui/insight-notification-controls') = require('../ui/insight-notification-controls');
      await coordinator.update({ entries: [], statements: archive.beliefStatements, locale, ready: true });
      const wrap = (offer: boolean) => <GestureHandlerRootView style={styles.root}><AppLocaleProvider><ScrollView contentContainerStyle={styles.content}><InsightNotificationControls offer={offer} available /></ScrollView></AppLocaleProvider></GestureHandlerRootView>;
      const rendered = await render(wrap(true), { timeout: 10_000 });
      await screen.findByTestId('insight-notification-offer');
      await captureEvidence(`${locale}-offer`);
      await pressLaidOutUntil({ testID: 'insight-notification-dismiss', isComplete: () => insightNotificationStore.getSnapshot().context.settings.dismissed });
      await waitUntil(() => insightNotificationStore.getSnapshot().context.settings.dismissed, { timeout: 10_000 }).catch((cause: unknown) => { throw new Error('Dismiss failed', { cause }); });
      expect(screen.queryByTestId('insight-notification-offer')).toBeNull();
      expect((await repository.loadInsightNotificationState()).dismissed).toBe(true);
      await rendered.rerender(wrap(false));
      if (Platform.OS === 'ios') expect((await Notifications.requestPermissionsAsync()).granted).toBe(true);
      await press('insight-notification-time');
      await waitUntil(() => insightNotificationStore.getSnapshot().context.pickerOpen, { timeout: 10_000 }).catch((cause: unknown) => { throw new Error('Picker open failed', { cause }); });
      if (Platform.OS === 'ios') {
        await screen.findByTestId('insight-notification-time-modal');
        await captureEvidence(`${locale}-time-picker`);
        await pressLaidOutUntil({ testID: 'insight-notification-time-modal-done', isComplete: () => !insightNotificationStore.getSnapshot().context.pickerOpen });
      } else {
        await coordinator.command({ type: INSIGHT_NOTIFICATION_EVENTS.PICKER_CHANGED, open: false });
      }
      await waitUntil(() => !insightNotificationStore.getSnapshot().context.pickerOpen, { timeout: 10_000 }).catch((cause: unknown) => { throw new Error('Picker close failed', { cause }); });
      await coordinator.command({ type: INSIGHT_NOTIFICATION_EVENTS.TIME_CHANGED, time: { hour: 19, minute: 15 } });
      expect((await repository.loadInsightNotificationState()).time).toEqual({ hour: 19, minute: 15 });
      await press('insight-notification-toggle');
      await waitUntil(() => insightNotificationStore.getSnapshot().context.settings.enabled && !insightNotificationStore.getSnapshot().context.busy, { timeout: 10_000 }).catch((cause: unknown) => { throw new Error(`Enable failed ${insightNotificationStore.getSnapshot().context.error}`, { cause }); });
      expect((await repository.loadInsightNotificationState()).enabled).toBe(true);
      expect((await repository.loadInsightNotificationState()).pending).toBeNull();
      await captureEvidence(`${locale}-enabled`);
      sentinelIdentifier = await Notifications.scheduleNotificationAsync({
        identifier: `insight-harness-sentinel-${locale}`,
        content: { title: 'Synthetic unrelated notification', data: { owner: 'insight-harness-unrelated' } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 3600 },
      });
      await coordinator.update({ entries: archive.checkIns, statements: archive.beliefStatements, locale, ready: true });
      const state = await repository.loadInsightNotificationState();
      expect(insightCandidates({ entries: archive.checkIns, statements: archive.beliefStatements, now }).length).toBeGreaterThan(0);
      if (!state.pending) throw new Error('Synthetic insights must register a pending batch.');
      const futureBatch = { ...state.pending, id: `insight-harness-batch-${locale}`, fireAt: new Date(Date.now() + 3_600_000).toISOString() };
      await repository.persistInsightNotificationState({ ...state, pending: futureBatch });
      await scheduler.reconcileInsightBatch({ batch: futureBatch, locale });
      await scheduler.reconcileInsightBatch({ batch: futureBatch, locale });
      const registered = await Notifications.getAllScheduledNotificationsAsync();
      expect(registered.filter((request) => request.content.data?.['owner'] === INSIGHT_NOTIFICATION_OWNER)).toHaveLength(1);
      expect(registered.find((request) => request.identifier === futureBatch.id)?.content.data?.['target']).toEqual(futureBatch.candidates[0]);
      await press('insight-notification-toggle');
      await waitUntil(() => !insightNotificationStore.getSnapshot().context.settings.enabled && !insightNotificationStore.getSnapshot().context.busy);
      expect((await repository.loadInsightNotificationState()).enabled).toBe(false);
      expect((await repository.loadInsightNotificationState()).pending).toBeNull();
      const after = await Notifications.getAllScheduledNotificationsAsync();
      expect(after.some((request) => request.content.data?.['owner'] === INSIGHT_NOTIFICATION_OWNER)).toBe(false);
      expect(after.some((request) => request.identifier === sentinelIdentifier)).toBe(true);
      await captureEvidence(`${locale}-disabled`);
    });
  }
});

const styles = StyleSheet.create({ root: { flex: 1 }, content: { padding: 20 } });
