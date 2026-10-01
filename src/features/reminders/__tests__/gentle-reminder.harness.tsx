import { afterEach, describe, expect, mock, render, resetModules, test, waitUntil } from 'react-native-harness';
import { screen } from '@react-native-harness/ui';
import { createActor, type Actor } from 'xstate';
import { useSelector } from '@xstate/react';
import { createRef } from 'react';
import { Platform, ScrollView, StyleSheet, type NativeScrollEvent, type NativeSyntheticEvent, type LayoutChangeEvent, type ScrollViewProps } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Directory, File, Paths } from 'expo-file-system';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as Notifications from 'expo-notifications';
import { connect, type SurrealClient } from 'react-native-surrealdb';
import { APP_LOCALES, BELIEF_LIBRARY_EVENTS, BELIEF_LIBRARY_STATES, CHECK_IN_EVENTS, FILE_URI_PREFIX, NAVIGATION_EVENTS, NAVIGATION_STATES, REMINDER_EVENTS, REMINDER_NOTIFICATION_CONTENT, REMINDER_NOTIFICATION_OWNER, REMINDER_STATES, REMINDER_TARGET_KINDS, SURREAL_DATABASE_ENDPOINT_PREFIX } from '@/constants';
import type { appNavigationMachine } from '@/navigation/app-navigation.composition';
import { runDatabaseMigrations } from '@/infrastructure/database/migrations/database-migration.runner';
import { pressLaidOutUntil } from '@/testing/harness-ui';
import { PersistedDataArchiveSchema, currentDataArchive } from '@/features/data-safety/domain/data-archive';
import legacyArchive from '@/features/data-safety/__tests__/fixtures/legacy-archive.fixture.json';
import { ReminderAssignmentId, ReminderTimestamp, type GuidingBeliefReminderAssignment } from '../domain/reminder-assignment';

let actor: Actor<typeof appNavigationMachine> | undefined;
let database: SurrealClient | undefined;
let sentinelIdentifier: string | undefined;
const scroll = createRef<ScrollView>();
let scrollOffset = 0;
let contentHeight = 0;
let viewportHeight = 0;

function recordScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
  scrollOffset = event.nativeEvent.contentOffset.y;
}

const recordContentSize: NonNullable<ScrollViewProps['onContentSizeChange']> = (...[, height]) => {
  contentHeight = height;
};

function recordViewport(event: LayoutChangeEvent) {
  viewportHeight = event.nativeEvent.layout.height;
}

async function scrollToEvidence({ end = false } = {}) {
  await waitUntil(() => viewportHeight > 0 && contentHeight > viewportHeight, { timeout: 10_000 }).catch((cause: unknown) => {
    throw new Error(`Scroll layout unavailable: ${contentHeight}/${viewportHeight}`, { cause });
  });
  const offset = end ? contentHeight - viewportHeight : 260;
  scroll.current?.scrollTo({ y: 10, animated: false });
  await waitUntil(() => Math.abs(scrollOffset - 10) < 0.5, { timeout: 10_000 }).catch((cause: unknown) => {
    throw new Error(`Scroll origin unavailable: ${scrollOffset}; state ${JSON.stringify(currentActor().getSnapshot().value)}`, { cause });
  });
  scroll.current?.scrollTo({ y: offset, animated: false });
  await waitUntil(() => Math.abs(scrollOffset - offset) < 2, { timeout: 10_000 }).catch((cause: unknown) => {
    throw new Error(`Scroll evidence unavailable: ${scrollOffset}/${offset}; ${contentHeight}/${viewportHeight}; state ${JSON.stringify(currentActor().getSnapshot().value)}`, { cause });
  });
}

function currentActor() {
  if (!actor) throw new Error('Reminder Harness actor is not ready.');
  return actor;
}

async function captureEvidence(name: string) {
  const screenshot = await screen.screenshot();
  if (!screenshot) throw new Error('Reminder screenshot is required.');
  const file = new File(Paths.cache, `gentle-reminder-${name}.png`);
  file.create({ overwrite: true });
  file.write(screenshot.data);
  console.log(`REMINDER_EVIDENCE ${file.uri}`);
}

function FixtureScrollView(props: ScrollViewProps) {
  return <ScrollView {...props} ref={scroll} onScroll={recordScroll} onContentSizeChange={recordContentSize} onLayout={recordViewport} scrollEventThrottle={16} />;
}

function FixtureScreens({ Library, Editor }: {
  Library: typeof import('@/features/beliefs/ui/belief-library-screen').BeliefLibraryScreen;
  Editor: typeof import('../ui/leitsatz-reminder-screen').LeitsatzReminderScreen;
}) {
  const snapshot = useSelector(currentActor(), (state) => state);
  return snapshot.matches(REMINDER_STATES.EDITOR) || snapshot.matches(REMINDER_STATES.SAVING)
    ? <Editor /> : <Library />;
}

afterEach(async () => {
  actor?.stop();
  actor = undefined;
  if (database) {
    await database.query('DELETE reminder_assignment');
    database = undefined;
  }
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(scheduled.filter((request) => request.content.data?.['owner'] === REMINDER_NOTIFICATION_OWNER && request.content.data['assignmentId'] === 'gentle-harness-assignment')
    .map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier)));
  if (sentinelIdentifier) await Notifications.cancelScheduledNotificationAsync(sentinelIdentifier);
  sentinelIdentifier = undefined;
  resetModules();
});

describe('gentle reminder overview and editor on native devices', () => {
  for (const locale of [APP_LOCALES.GERMAN, APP_LOCALES.ENGLISH]) {
    test(`shows saved timing and deactivates durably in ${locale}`, async () => {
      const archive = currentDataArchive(await Effect.runPromise(Schema.decodeUnknown(PersistedDataArchiveSchema)(legacyArchive)));
      expect(archive.checkIns.length).toBe(133);
      expect(archive.beliefStatements.length).toBe(15);
      const directory = new Directory(Paths.cache, `gentle-reminder-harness-${locale}-${Date.now()}`);
      directory.create({ idempotent: true });
      if (!directory.uri.startsWith(FILE_URI_PREFIX)) throw new Error('Fixture database must be local.');
      const fixtureDatabase = await connect({
        endpoint: `${SURREAL_DATABASE_ENDPOINT_PREFIX}${directory.uri.slice(FILE_URI_PREFIX.length)}`,
        namespace: 'gentle-reminder-harness', database: 'local',
      });
      database = fixtureDatabase;
      await Effect.runPromise(runDatabaseMigrations(fixtureDatabase));
      mock('@/infrastructure/database/surrealdb.database', () => ({
        getDatabase: () => Promise.resolve(fixtureDatabase),
        queryDatabase: ({ surql, variables }: { surql: string; variables?: Parameters<SurrealClient['query']>[1] }) => variables === undefined
          ? fixtureDatabase.query(surql) : fixtureDatabase.query(surql, variables),
      }));
      mock('@/components/ui/persistent-scroll-view', () => ({
        PersistentScrollView: FixtureScrollView,
        PersistentKeyboardAwareScrollView: FixtureScrollView,
      }));
      const repository: typeof import('../infrastructure/reminder.repository') = require('../infrastructure/reminder.repository');
      const { appSettingsStore, checkInHistoryStore }: typeof import('@/app-stores') = require('@/app-stores');
      const { AppLocaleProvider }: typeof import('@/localization/app-locale-provider') = require('@/localization/app-locale-provider');
      const { AppNavigationActorProvider }: typeof import('@/navigation/app-navigation.provider') = require('@/navigation/app-navigation.provider');
      const dataRepository: typeof import('@/features/data-safety/infrastructure/data-archive.repository') = require('@/features/data-safety/infrastructure/data-archive.repository');
      await Effect.runPromise(dataRepository.restoreDataArchive({ ...archive, settings: { ...archive.settings, locale } }));
      const beliefRepository: typeof import('@/features/beliefs/infrastructure/belief-statement.repository') = require('@/features/beliefs/infrastructure/belief-statement.repository');
      const [statement] = await Effect.runPromise(beliefRepository.loadBeliefStatements);
      if (!statement) throw new Error('Synthetic archive requires a guiding belief.');
      const timestamp = ReminderTimestamp.make('2026-10-01T08:00:00.000Z');
      const assignment: GuidingBeliefReminderAssignment = {
        id: ReminderAssignmentId.make('gentle-harness-assignment'), schemaVersion: 2,
        targetKind: REMINDER_TARGET_KINDS.GUIDING_BELIEF, beliefSystemId: statement.beliefSystemId,
        notificationContent: REMINDER_NOTIFICATION_CONTENT.GENERAL, enabled: true,
        weekdays: [1, 2, 3, 4, 5, 6, 7], times: [{ hour: 9, minute: 3 }], createdAt: timestamp, updatedAt: timestamp,
      };
      await Effect.runPromise(repository.persistReminderAssignment(assignment));
      if (Platform.OS === 'ios') {
        const permission = await Notifications.requestPermissionsAsync();
        expect(permission.granted).toBe(true);
      }
      const sentinel = await Notifications.scheduleNotificationAsync({
        content: { title: 'Synthetic unrelated notification', data: { owner: 'gentle-harness-unrelated' } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 3600 },
      });
      sentinelIdentifier = sentinel;
      const scheduler: typeof import('../infrastructure/local-reminder.scheduler') = require('../infrastructure/local-reminder.scheduler');
      await scheduler.reconcileReminderNotifications({ assignments: [assignment], locale, statements: archive.beliefStatements });
      const before = await Notifications.getAllScheduledNotificationsAsync();
      expect(before.some((request) => request.content.data?.['assignmentId'] === assignment.id)).toBe(true);
      appSettingsStore.trigger.hydrated({ settings: { ...archive.settings, locale } });
      const { createAppNavigationMachine }: typeof import('@/navigation/app-navigation.machine') = require('@/navigation/app-navigation.machine');
      actor = createActor(createAppNavigationMachine({
        appSettingsStore, checkInHistoryStore,
        nonce: () => 'gentle-harness', now: () => new Date(),
      })).start();
      await waitUntil(() => currentActor().getSnapshot().matches(NAVIGATION_STATES.TABS) && currentActor().getSnapshot().context.reminderDataHydrated && currentActor().getSnapshot().context.beliefStatementsHydrated, { timeout: 10_000 }).catch((cause: unknown) => {
        throw new Error(`Reminder initialization failed: ${JSON.stringify(currentActor().getSnapshot().value)}`, { cause });
      });
      currentActor().send({ type: CHECK_IN_EVENTS.BELIEF_STATEMENTS_HYDRATED, statements: [statement] });
      currentActor().send({ type: NAVIGATION_EVENTS.SETTINGS_OPENED });
      currentActor().send({ type: BELIEF_LIBRARY_EVENTS.OPENED });
      const library: typeof import('@/features/beliefs/ui/belief-library-screen') = require('@/features/beliefs/ui/belief-library-screen');
      const editor: typeof import('../ui/leitsatz-reminder-screen') = require('../ui/leitsatz-reminder-screen');
      await render(
        <GestureHandlerRootView style={styles.root}>
          <AppNavigationActorProvider actor={currentActor()}>
            <AppLocaleProvider><FixtureScreens Library={library.BeliefLibraryScreen} Editor={editor.LeitsatzReminderScreen} /></AppLocaleProvider>
          </AppNavigationActorProvider>
        </GestureHandlerRootView>,
        { timeout: 10_000 },
      );
      await screen.findByTestId('reminder-timing-summary');
      await scrollToEvidence();
      await captureEvidence(`${locale}-overview`);
      await pressLaidOutUntil({
        testID: `belief-reminder-edit-${statement.beliefSystemId}`,
        isComplete: () => currentActor().getSnapshot().matches(REMINDER_STATES.EDITOR),
      });
      await waitUntil(() => currentActor().getSnapshot().matches(REMINDER_STATES.EDITOR), { timeout: 10_000 });
      await screen.findByTestId('reminder-deactivate');
      await scrollToEvidence({ end: true });
      await captureEvidence(`${locale}-editor`);
      await pressLaidOutUntil({
        testID: 'reminder-deactivate',
        isComplete: () => currentActor().getSnapshot().matches(REMINDER_STATES.SAVING) || currentActor().getSnapshot().matches(BELIEF_LIBRARY_STATES.LIBRARY),
      });
      await waitUntil(() => currentActor().getSnapshot().matches(BELIEF_LIBRARY_STATES.LIBRARY), { timeout: 10_000 }).catch((cause: unknown) => {
        throw new Error(`Reminder deactivation failed: ${JSON.stringify(currentActor().getSnapshot().value)}; ${currentActor().getSnapshot().context.reminderError}`, { cause });
      });
      expect(currentActor().getSnapshot().context.reminderAssignments[0]?.enabled).toBe(false);
      const reloaded = await Effect.runPromise(repository.loadReminderData);
      expect(reloaded[0]).toMatchObject({ enabled: false, weekdays: assignment.weekdays, times: assignment.times });
      const after = await Notifications.getAllScheduledNotificationsAsync();
      expect(after.some((request) => request.content.data?.['assignmentId'] === assignment.id)).toBe(false);
      expect(after.some((request) => request.identifier === sentinel)).toBe(true);
      await Notifications.cancelScheduledNotificationAsync(sentinel);
      sentinelIdentifier = undefined;
      await screen.findByTestId('reminder-timing-summary');
      await scrollToEvidence();
      await captureEvidence(`${locale}-off`);
      currentActor().send({ type: REMINDER_EVENTS.ASSIGNMENT_EDIT_REQUESTED, assignmentId: assignment.id });
      expect(currentActor().getSnapshot().context.reminderTimesDraft).toEqual(assignment.times);
    });
  }
});

const styles = StyleSheet.create({ root: { flex: 1 } });
