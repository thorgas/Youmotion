import { fireEvent, render, screen } from '@testing-library/react-native';
import { createActor, waitFor, type Actor } from 'xstate';

import {
  APP_LOCALES,
  EMOTION_LABEL_MODES,
  NAVIGATION_EVENTS,
  REMINDER_EVENTS,
  REMINDER_NOTIFICATION_CONTENT,
  REMINDER_STATES,
  REMINDER_TARGET_KINDS,
} from '@/constants';
import { CustomBeliefSystemId } from '@/features/check-in/domain/belief-statement';
import { appSettingsStore } from '@/features/settings/application/app-settings.store';
import { configureAppLocale } from '@/localization/app-locale.configuration';
import { appNavigationMachine } from '@/navigation/app-navigation.machine';
import { AppNavigationActorProvider } from '@/navigation/app-navigation.provider';
import {
  mockSurrealDatabase,
  mockSurrealQuery,
  resetSurrealDatabaseMock,
} from '@/test-utils/surrealdb.repository.mock';
import {
  ReminderAssignmentId,
  ReminderTimestamp,
  type ReminderAssignment,
} from '../domain/reminder-assignment';
import { ReminderSettingsScreen } from '../ui/reminder-settings-screen';

jest.mock('expo-router', () => ({
  router: { dismissTo: jest.fn(), push: jest.fn(), replace: jest.fn() },
}));

jest.mock('@/features/check-in/infrastructure/surrealdb.database', () => ({
  getDatabase: jest.fn(() => Promise.resolve(mockSurrealDatabase)),
  queryDatabase: jest.fn(({ surql, variables }: {
    surql: string;
    variables?: Parameters<typeof mockSurrealDatabase.query>[1];
  }) => variables === undefined
    ? mockSurrealDatabase.query(surql)
    : mockSurrealDatabase.query(surql, variables)),
}));

jest.mock('../infrastructure/local-reminder.scheduler', () => ({
  getReminderPermission: jest.fn(() => Promise.resolve('granted')),
  requestReminderPermission: jest.fn(() => Promise.resolve('granted')),
  reconcileReminderNotifications: jest.fn(() => Promise.resolve()),
  sendTestReminder: jest.fn(() => Promise.resolve(true)),
}));

const timestamp = ReminderTimestamp.make('2026-08-18T08:00:00.000Z');
const beliefSystemId = CustomBeliefSystemId.make('custom-support');
const pulse = {
  id: ReminderAssignmentId.make('pulse'),
  schemaVersion: 2,
  targetKind: REMINDER_TARGET_KINDS.PULSE,
  enabled: true,
  weekdays: [2, 3, 4, 5, 6],
  times: [{ hour: 9, minute: 0 }],
  createdAt: timestamp,
  updatedAt: timestamp,
} satisfies ReminderAssignment;
const leitsatz = {
  id: ReminderAssignmentId.make('leitsatz'),
  schemaVersion: 2,
  targetKind: REMINDER_TARGET_KINDS.GUIDING_BELIEF,
  beliefSystemId,
  enabled: true,
  weekdays: [7],
  times: [{ hour: 18, minute: 0 }],
  notificationContent: REMINDER_NOTIFICATION_CONTENT.LEITSATZ,
  createdAt: timestamp,
  updatedAt: timestamp,
} satisfies ReminderAssignment;

async function actorAtReminderSettings() {
  const actor = createActor(appNavigationMachine).start();
  actor.send({ type: NAVIGATION_EVENTS.SETTINGS_OPENED });
  actor.send({ type: REMINDER_EVENTS.OPENED });
  await waitFor(actor, (snapshot) => (
    snapshot.matches(REMINDER_STATES.SETTINGS)
    && snapshot.context.reminderAssignments.length === 2
  ));
  return actor;
}

async function renderSettings(actor: Actor<typeof appNavigationMachine>) {
  return render(
    <AppNavigationActorProvider actor={actor}>
      <ReminderSettingsScreen />
    </AppNavigationActorProvider>,
  );
}

describe('emotion check-in reminder settings', () => {
  beforeAll(() => configureAppLocale(appSettingsStore));

  beforeEach(() => {
    resetSurrealDatabaseMock();
    mockSurrealQuery.mockImplementation((surql: string) => {
      if (surql.includes('FROM reminder_assignment')) {
        return Promise.resolve([{ statementIndex: 0, value: [pulse, leitsatz] }]);
      }
      return Promise.resolve([{ statementIndex: 0, value: [] }]);
    });
    appSettingsStore.trigger.hydrated({ settings: {
      locale: APP_LOCALES.ENGLISH,
      emotionLabelMode: EMOTION_LABEL_MODES.BOTH,
      onboardingCompleted: true,
    } });
  });

  it('presents the Pulse assignment as an emotion check-in reminder', async () => {
    const actor = await actorAtReminderSettings();
    await renderSettings(actor);

    expect(screen.getAllByText('EMOTION CHECK-IN')).toHaveLength(2);
    expect(screen.getByText('Check in with your emotions')).toBeOnTheScreen();
    expect(screen.getByText('Monday, Tuesday, Wednesday, Thursday, Friday · 09:00'))
      .toBeOnTheScreen();
    expect(screen.queryByText('18:00')).not.toBeOnTheScreen();
  });

  it('opens the Pulse reminder as an assignment-owned timing draft', async () => {
    const actor = await actorAtReminderSettings();
    await renderSettings(actor);

    await fireEvent.press(screen.getByTestId('reminder-edit-pulse'));
    expect(actor.getSnapshot().matches(REMINDER_STATES.EDITOR)).toBe(true);
    expect(actor.getSnapshot().context).toMatchObject({
      reminderAssignmentDraftId: pulse.id,
      reminderWeekdaysDraft: pulse.weekdays,
      reminderTimesDraft: pulse.times,
    });
  });

  it('starts a new emotion check-in reminder without asking for a schedule name', async () => {
    const actor = await actorAtReminderSettings();
    await renderSettings(actor);

    await fireEvent.press(screen.getByTestId('reminder-settings-new'));
    await waitFor(actor, (snapshot) => snapshot.matches(REMINDER_STATES.EDITOR));
    expect(actor.getSnapshot().context.reminderTargetKind).toBe(REMINDER_TARGET_KINDS.PULSE);
  });
});
