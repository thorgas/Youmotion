import { fireEvent, render, screen } from '@testing-library/react-native';
import { createActor, waitFor, type Actor } from 'xstate';

import {
  APP_LOCALES,
  BELIEF_LIBRARY_EVENTS,
  CHECK_IN_EVENTS,
  EMOTION_LABEL_MODES,
  NAVIGATION_EVENTS,
  REMINDER_EVENTS,
  REMINDER_NOTIFICATION_CONTENT,
  REMINDER_PERMISSION_STATES,
  REMINDER_STATES,
  REMINDER_TARGET_KINDS,
} from '@/constants';
import { appSettingsStore } from '@/app-stores';
import { configureAppLocale } from '@/localization/app-locale.configuration';
import { appNavigationMachine } from '@/navigation/app-navigation.composition';
import { AppNavigationActorProvider } from '@/navigation/app-navigation.provider';
import {
  mockSurrealDatabase,
  resetSurrealDatabaseMock,
} from '@/test-utils/surrealdb.repository.mock';
import * as reminderScheduler from '../infrastructure/local-reminder.scheduler';
import { LeitsatzReminderScreen } from '../ui/leitsatz-reminder-screen';
import { borderColors, palette } from '@/theme';
import { CustomBeliefSystemId } from '@/features/beliefs/domain/belief-statement';
import { ReminderAssignmentId } from '../domain/reminder-assignment';

jest.mock('expo-router', () => ({
  router: { dismissTo: jest.fn(), push: jest.fn(), replace: jest.fn() },
}));

jest.mock('@/infrastructure/database/surrealdb.database', () => ({
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
const mockGetReminderPermission = jest.mocked(reminderScheduler.getReminderPermission);

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

async function actorAtEmotionCheckInReminderOffer() {
  const actor = createActor(appNavigationMachine).start();
  actor.send({ type: NAVIGATION_EVENTS.SETTINGS_OPENED });
  actor.send({ type: REMINDER_EVENTS.OPENED });
  await waitFor(actor, (snapshot) => snapshot.matches(REMINDER_STATES.SETTINGS));
  actor.send({ type: REMINDER_EVENTS.CREATE_REQUESTED });
  await waitFor(actor, (snapshot) => snapshot.matches(REMINDER_STATES.OFFER));
  return actor;
}

async function renderReminder(actor: Actor<typeof appNavigationMachine>) {
  return render(
    <AppNavigationActorProvider actor={actor}>
      <LeitsatzReminderScreen />
    </AppNavigationActorProvider>,
  );
}

describe('Leitsatz reminder screen', () => {
  beforeAll(() => configureAppLocale(appSettingsStore));

  beforeEach(() => {
    resetSurrealDatabaseMock();
    appSettingsStore.trigger.hydrated({ settings: {
      locale: APP_LOCALES.ENGLISH,
      emotionLabelMode: EMOTION_LABEL_MODES.BOTH,
      onboardingCompleted: true,
    } });
    mockRequestReminderPermission.mockResolvedValue(REMINDER_PERMISSION_STATES.GRANTED);
    mockGetReminderPermission.mockResolvedValue(REMINDER_PERMISSION_STATES.UNDETERMINED);
  });

  it('explains permission before creating any reminder', async () => {
    const actor = await actorAtReminderOffer();
    await renderReminder(actor);

    expect(screen.getByText('Would you like a friendly reminder of your new Leitsatz?'))
      .toBeOnTheScreen();
    expect(screen.getByText('“I can ask for support.”')).toBeOnTheScreen();
    expect(screen.getByTestId('positive-leitsatz-card')).toHaveStyle({
      backgroundColor: palette.selectionWash,
      borderColor: borderColors.moss20,
    });
    expect(actor.getSnapshot().context.reminderAssignments).toEqual([]);
  });

  it('shows the focused notification Leitsatz on its positive surface', async () => {
    const actor = createActor(appNavigationMachine).start();
    const beliefSystemId = CustomBeliefSystemId.make('custom-focused-notification-belief');
    actor.send({
      type: REMINDER_EVENTS.NOTIFICATION_OPENED,
      assignmentId: ReminderAssignmentId.make('focused-notification-assignment'),
      targetKind: REMINDER_TARGET_KINDS.GUIDING_BELIEF,
      beliefSystemId,
    });
    actor.send({
      type: CHECK_IN_EVENTS.BELIEF_STATEMENTS_HYDRATED,
      statements: [{
        kind: 'custom',
        beliefSystemId,
        harmfulStatement: 'I must always be available.',
        guidingStatement: 'I may protect time for myself.',
      }],
    });
    await renderReminder(actor);

    expect(screen.getByText('A thought that may accompany you.')).toBeOnTheScreen();
    expect(screen.getByText('“I may protect time for myself.”')).toBeOnTheScreen();
    expect(screen.getByTestId('positive-leitsatz-card')).toHaveStyle({
      backgroundColor: palette.selectionWash,
      borderColor: borderColors.moss20,
    });
  });

  it('describes only the timing choices available for an emotion check-in reminder', async () => {
    const actor = await actorAtEmotionCheckInReminderOffer();
    await renderReminder(actor);

    expect(screen.getByText('EMOTION CHECK-IN')).toBeOnTheScreen();
    expect(screen.getByText(
      'After permission, you can choose the days and times for this reminder.',
    )).toBeOnTheScreen();
    expect(screen.queryByText(/words that may appear/)).not.toBeOnTheScreen();
  });

  it('lets the user choose general or Leitsatz content immediately after permission', async () => {
    const actor = await actorAtReminderOffer();
    await renderReminder(actor);

    await fireEvent.press(screen.getByRole('button', {
      name: 'Allow notifications and continue',
    }));

    expect(await screen.findByText('Choose when it should return.')).toBeOnTheScreen();
    expect(screen.getByTestId('reminder-preview-general'))
      .toHaveProp('accessibilityState', { checked: true });
    await fireEvent.press(screen.getByTestId('reminder-preview-full'));
    expect(actor.getSnapshot().context.reminderNotificationContentDraft)
      .toBe(REMINDER_NOTIFICATION_CONTENT.LEITSATZ);
    expect(screen.getByTestId('reminder-preview-full'))
      .toHaveProp('accessibilityState', { checked: true });
  });

  it('edits days and times without a reusable schedule or required name', async () => {
    const actor = await actorAtReminderOffer();
    await renderReminder(actor);
    await fireEvent.press(screen.getByRole('button', {
      name: 'Allow notifications and continue',
    }));

    expect(await screen.findByRole('button', { name: 'Activate reminder' })).toBeEnabled();
    expect(screen.queryByLabelText('Schedule name')).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('reminder-weekday-7'));
    await fireEvent.press(screen.getByRole('button', { name: 'Add another time' }));

    expect(actor.getSnapshot().context).toMatchObject({
      reminderWeekdaysDraft: [2, 3, 4, 5, 6, 7],
      reminderTimesDraft: [{ hour: 9, minute: 0 }, { hour: 18, minute: 0 }],
    });
  });

  it('keeps the last selected day active when it is pressed again', async () => {
    const actor = await actorAtReminderOffer();
    await renderReminder(actor);
    await fireEvent.press(screen.getByRole('button', {
      name: 'Allow notifications and continue',
    }));
    expect(await screen.findByRole('button', { name: 'Activate reminder' })).toBeEnabled();

    await fireEvent.press(screen.getByTestId('reminder-weekday-2'));
    await fireEvent.press(screen.getByTestId('reminder-weekday-3'));
    await fireEvent.press(screen.getByTestId('reminder-weekday-4'));
    await fireEvent.press(screen.getByTestId('reminder-weekday-5'));
    await fireEvent.press(screen.getByTestId('reminder-weekday-6'));

    expect(actor.getSnapshot().context.reminderWeekdaysDraft).toEqual([6]);
    expect(screen.getByTestId('reminder-weekday-6'))
      .toHaveProp('accessibilityState', { selected: true });
    expect(screen.getByRole('button', { name: 'Activate reminder' })).toBeEnabled();
  });

  it('keeps permission denial side-effect free and exposes repair actions', async () => {
    mockRequestReminderPermission.mockResolvedValueOnce(REMINDER_PERMISSION_STATES.DENIED);
    const actor = await actorAtReminderOffer();
    await renderReminder(actor);

    await fireEvent.press(screen.getByRole('button', {
      name: 'Allow notifications and continue',
    }));

    expect(await screen.findByText('Notifications are turned off.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Open system settings' })).toBeOnTheScreen();
    expect(actor.getSnapshot().context.reminderAssignments).toEqual([]);
  });
});
