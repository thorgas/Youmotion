import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { createActor, waitFor, type Actor } from 'xstate';

import {
  APP_LOCALES,
  BELIEF_LIBRARY_EVENTS,
  EMOTION_LABEL_MODES,
  NAVIGATION_EVENTS,
  REMINDER_EVENTS,
  REMINDER_PERMISSION_STATES,
  REMINDER_STATES,
} from '@/constants';
import { appSettingsStore } from '@/features/settings/application/app-settings.store';
import { configureAppLocale } from '@/localization/app-locale.configuration';
import { AppNavigationActorProvider } from '@/navigation/app-navigation.provider';
import { appNavigationMachine } from '@/navigation/app-navigation.machine';
import {
  mockSurrealDatabase,
  resetSurrealDatabaseMock,
} from '@/test-utils/surrealdb.repository.mock';
import * as reminderScheduler from '../infrastructure/local-reminder.scheduler';
import { LeitsatzReminderScreen } from '../ui/leitsatz-reminder-screen';

jest.mock('expo-router', () => ({
  router: {
    dismissTo: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
  },
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

const mockRequestReminderPermission = jest.mocked(reminderScheduler.requestReminderPermission);

async function actorAtReminderOffer() {
  const actor = createActor(appNavigationMachine).start();
  actor.send({ type: NAVIGATION_EVENTS.SETTINGS_OPENED });
  actor.send({ type: BELIEF_LIBRARY_EVENTS.OPENED });
  actor.send({ type: BELIEF_LIBRARY_EVENTS.CREATE_REQUESTED });
  actor.send({
    type: BELIEF_LIBRARY_EVENTS.HARMFUL_DRAFT_CHANGED,
    statement: 'I must solve everything alone.',
  });
  actor.send({
    type: BELIEF_LIBRARY_EVENTS.GUIDING_DRAFT_CHANGED,
    statement: 'I can ask for support.',
  });
  actor.send({ type: BELIEF_LIBRARY_EVENTS.SAVE_REQUESTED });
  await waitFor(actor, (snapshot) => snapshot.matches(REMINDER_STATES.OFFER));
  return actor;
}

async function renderReminder(actor: Actor<typeof appNavigationMachine>) {
  await render(
    <AppNavigationActorProvider actor={actor}>
      <LeitsatzReminderScreen />
    </AppNavigationActorProvider>,
  );
}

async function actorAtPulseReminderOffer() {
  const actor = createActor(appNavigationMachine).start();
  actor.send({ type: NAVIGATION_EVENTS.SETTINGS_OPENED });
  actor.send({ type: REMINDER_EVENTS.OPENED });
  await waitFor(actor, (snapshot) => snapshot.matches(REMINDER_STATES.SETTINGS));
  actor.send({ type: REMINDER_EVENTS.NEW_SCHEDULE_REQUESTED });
  return actor;
}

describe('Leitsatz reminder screen', () => {
  beforeAll(() => configureAppLocale(appSettingsStore));

  beforeEach(() => {
    resetSurrealDatabaseMock();
    appSettingsStore.trigger.hydrated({
      settings: {
        locale: APP_LOCALES.ENGLISH,
        emotionLabelMode: EMOTION_LABEL_MODES.BOTH,
        onboardingCompleted: true,
      },
    });
    mockRequestReminderPermission.mockResolvedValue(REMINDER_PERMISSION_STATES.GRANTED);
  });

  it('explains permission before any schedule is available', async () => {
    const actor = await actorAtReminderOffer();
    await renderReminder(actor);

    expect(screen.getByText('Would you like a friendly reminder of your new Leitsatz?'))
      .toBeOnTheScreen();
    expect(screen.getByText('“I can ask for support.”')).toBeOnTheScreen();
    expect(screen.queryByText('When should it return?')).not.toBeOnTheScreen();
    expect(actor.getSnapshot().context.reminderAssignments).toEqual([]);
  });

  it('identifies a Pulse offer without implying a Leitsatz was saved', async () => {
    const actor = await actorAtPulseReminderOffer();
    await renderReminder(actor);

    expect(screen.getByText('PULSE REMINDER')).toBeOnTheScreen();
    expect(screen.queryByText('LEITSATZ SAVED')).not.toBeOnTheScreen();
  });

  it('keeps denial side-effect-free and exposes repair actions', async () => {
    mockRequestReminderPermission.mockResolvedValueOnce(REMINDER_PERMISSION_STATES.DENIED);
    const actor = await actorAtReminderOffer();
    await renderReminder(actor);

    await fireEvent.press(screen.getByRole('button', {
      name: 'Allow notifications and continue',
    }));

    expect(await screen.findByText('Notifications are turned off.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Open system settings' })).toBeOnTheScreen();
    expect(screen.queryByText('When should it return?')).not.toBeOnTheScreen();
    expect(actor.getSnapshot().context.reminderSchedules).toEqual([]);
    expect(actor.getSnapshot().context.reminderAssignments).toEqual([]);
  });

  it('shows the existing-or-new schedule choice only after permission succeeds', async () => {
    const actor = await actorAtReminderOffer();
    await renderReminder(actor);

    await fireEvent.press(screen.getByRole('button', {
      name: 'Allow notifications and continue',
    }));

    expect(await screen.findByText('When should it return?'))
      .toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Create new schedule' })).toBeOnTheScreen();
  });

  it('edits several wall-clock times through machine-owned controls', async () => {
    const actor = await actorAtReminderOffer();
    await renderReminder(actor);

    await fireEvent.press(screen.getByRole('button', {
      name: 'Allow notifications and continue',
    }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Create new schedule' }));
    await fireEvent.changeText(screen.getByLabelText('Schedule name'), 'Morning and evening');
    await fireEvent.press(screen.getByTestId('reminder-weekday-7'));
    await fireEvent.press(screen.getByRole('button', { name: 'Add another time' }));
    expect(screen.getByTestId('reminder-time-picker-0')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('reminder-time-picker-0'));
    expect(screen.getByTestId('reminder-time-modal-0')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Done' })).toBeOnTheScreen();
    await act(() => {
      actor.send({ type: REMINDER_EVENTS.TIME_CHANGED, index: 0, hour: 9, minute: 30 });
    });
    expect(actor.getSnapshot().context.reminderTimePickerIndex).toBe(0);
    await fireEvent.press(screen.getByTestId('reminder-time-modal-0-done'));

    expect(actor.getSnapshot().context).toMatchObject({
      reminderScheduleNameDraft: 'Morning and evening',
      reminderTimesDraft: [{ hour: 9, minute: 30 }, { hour: 18, minute: 0 }],
      reminderWeekdaysDraft: [2, 3, 4, 5, 6, 7],
      reminderTimePickerIndex: null,
    });
    expect(screen.getByTestId('reminder-time-picker-0')).toBeOnTheScreen();
    expect(screen.getByTestId('reminder-time-picker-1')).toBeOnTheScreen();
  });
});
