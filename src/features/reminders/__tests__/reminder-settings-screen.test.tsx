import { render, screen } from '@testing-library/react-native';
import { createActor, waitFor, type Actor } from 'xstate';

import {
  APP_LOCALES,
  EMOTION_LABEL_MODES,
  NAVIGATION_EVENTS,
  REMINDER_EVENTS,
  REMINDER_STATES,
  REMINDER_TARGET_KINDS,
} from '@/constants';
import {
  CustomBeliefSystemId,
  type BeliefStatement,
} from '@/features/check-in/domain/belief-statement';
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
  type ReminderAssignment,
} from '../domain/reminder-assignment';
import {
  ReminderScheduleId,
  ReminderScheduleTimestamp,
  type ReminderSchedule,
} from '../domain/reminder-schedule';
import { ReminderSettingsScreen } from '../ui/reminder-settings-screen';

jest.mock('expo-router', () => ({
  router: {
    dismissTo: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
  },
}));

jest.mock('@/features/check-in/infrastructure/surrealdb.database', () => ({
  getDatabase: jest.fn(() => Promise.resolve(mockSurrealDatabase)),
}));

jest.mock('../infrastructure/local-reminder.scheduler', () => ({
  getReminderPermission: jest.fn(() => Promise.resolve('granted')),
  requestReminderPermission: jest.fn(() => Promise.resolve('granted')),
  reconcileReminderNotifications: jest.fn(() => Promise.resolve()),
  sendTestReminder: jest.fn(() => Promise.resolve(true)),
}));

const timestamp = ReminderScheduleTimestamp.make('2026-08-13T08:00:00.000Z');
const scheduleId = ReminderScheduleId.make('gentle-rhythm');
const firstBeliefSystemId = CustomBeliefSystemId.make('custom-support');
const secondBeliefSystemId = CustomBeliefSystemId.make('custom-rest');
const schedule = {
  id: scheduleId,
  schemaVersion: 1,
  name: 'Sanfter Rhythmus',
  weekdays: [2, 3, 4, 5, 6, 7],
  times: [{ hour: 9, minute: 0 }, { hour: 18, minute: 0 }],
  createdAt: timestamp,
  updatedAt: timestamp,
} satisfies ReminderSchedule;
const statements = [{
  kind: 'custom',
  beliefSystemId: firstBeliefSystemId,
  harmfulStatement: 'I must do everything alone.',
  guidingStatement: 'I can ask for support.',
}, {
  kind: 'custom',
  beliefSystemId: secondBeliefSystemId,
  harmfulStatement: 'I must always keep going.',
  guidingStatement: 'Rest belongs in my life.',
}] satisfies readonly BeliefStatement[];
const assignments = [{
  id: ReminderAssignmentId.make('pulse'),
  schemaVersion: 1,
  scheduleId,
  targetKind: REMINDER_TARGET_KINDS.PULSE,
  enabled: true,
  createdAt: timestamp,
  updatedAt: timestamp,
}, {
  id: ReminderAssignmentId.make('support'),
  schemaVersion: 1,
  scheduleId,
  targetKind: REMINDER_TARGET_KINDS.GUIDING_BELIEF,
  beliefSystemId: firstBeliefSystemId,
  enabled: true,
  showFullText: false,
  createdAt: timestamp,
  updatedAt: timestamp,
}, {
  id: ReminderAssignmentId.make('rest'),
  schemaVersion: 1,
  scheduleId,
  targetKind: REMINDER_TARGET_KINDS.GUIDING_BELIEF,
  beliefSystemId: secondBeliefSystemId,
  enabled: false,
  showFullText: false,
  createdAt: timestamp,
  updatedAt: timestamp,
}] satisfies readonly ReminderAssignment[];

async function actorAtReminderSettings() {
  const actor = createActor(appNavigationMachine).start();
  actor.send({ type: NAVIGATION_EVENTS.SETTINGS_OPENED });
  actor.send({ type: REMINDER_EVENTS.OPENED });
  await waitFor(actor, (snapshot) => (
    snapshot.matches(REMINDER_STATES.SETTINGS)
    && snapshot.context.reminderSchedules.length === 1
    && snapshot.context.beliefStatements.length === 2
  ));
  return actor;
}

async function renderSettings(actor: Actor<typeof appNavigationMachine>) {
  await render(
    <AppNavigationActorProvider actor={actor}>
      <ReminderSettingsScreen />
    </AppNavigationActorProvider>,
  );
}

describe('reminder settings screen', () => {
  beforeAll(() => configureAppLocale(appSettingsStore));

  beforeEach(() => {
    resetSurrealDatabaseMock();
    mockSurrealQuery.mockImplementation((surql: string) => {
      if (surql.includes('FROM reminder_schedule')) {
        return Promise.resolve([{ statementIndex: 0, value: [schedule] }]);
      }
      if (surql.includes('FROM reminder_assignment')) {
        return Promise.resolve([{ statementIndex: 0, value: assignments }]);
      }
      if (surql.includes('FROM belief_statement')) {
        return Promise.resolve([{ statementIndex: 0, value: statements }]);
      }
      return Promise.resolve([{ statementIndex: 0, value: [] }]);
    });
    appSettingsStore.trigger.hydrated({
      settings: {
        locale: APP_LOCALES.GERMAN,
        emotionLabelMode: EMOTION_LABEL_MODES.BOTH,
        onboardingCompleted: true,
      },
    });
  });

  it('names weekdays and identifies every scheduled reminder target', async () => {
    const actor = await actorAtReminderSettings();
    appSettingsStore.trigger.languageChanged({ locale: APP_LOCALES.GERMAN });
    await renderSettings(actor);

    expect(screen.getByText(
      'Montag, Dienstag, Mittwoch, Donnerstag, Freitag, Samstag · 09:00, 18:00',
    )).toBeOnTheScreen();
    expect(screen.getByText('Gefühl auswählen')).toBeOnTheScreen();
    expect(screen.getByText('“I can ask for support.”')).toBeOnTheScreen();
    expect(screen.getByText('“Rest belongs in my life.”')).toBeOnTheScreen();
  });
});
