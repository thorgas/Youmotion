import { fireEvent, render, screen } from '@testing-library/react-native';
import { createActor, waitFor, type Actor } from 'xstate';

import {
  APP_LOCALES,
  BELIEF_LIBRARY_EVENTS,
  BELIEF_LIBRARY_STATES,
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
  failNextSurrealUpsert,
  resetSurrealDatabaseMock,
} from '@/test-utils/surrealdb.repository.mock';
import * as reminderScheduler from '../infrastructure/local-reminder.scheduler';
import { LeitsatzReminderScreen } from '../ui/leitsatz-reminder-screen';
import { borderColors, palette } from '@/theme';
import { CustomBeliefSystemId } from '@/features/beliefs/domain/belief-statement';
import { BeliefLibraryScreen } from '@/features/beliefs/ui/belief-library-screen';
import { ReminderAssignmentId, ReminderTimestamp, type ReminderAssignment } from '../domain/reminder-assignment';

const editableAssignment = {
  id: ReminderAssignmentId.make('editor-deactivation'),
  schemaVersion: 2,
  targetKind: REMINDER_TARGET_KINDS.GUIDING_BELIEF,
  beliefSystemId: CustomBeliefSystemId.make('custom-editor-deactivation'),
  notificationContent: REMINDER_NOTIFICATION_CONTENT.GENERAL,
  enabled: true,
  weekdays: [2, 4, 6],
  times: [{ hour: 9, minute: 3 }],
  createdAt: ReminderTimestamp.make('2026-10-01T08:00:00.000Z'),
  updatedAt: ReminderTimestamp.make('2026-10-01T08:00:00.000Z'),
} satisfies ReminderAssignment;

async function actorAtExistingEditor({ enabled = true } = {}) {
  const actor = createActor(appNavigationMachine).start();
  await waitFor(actor, (snapshot) => snapshot.context.reminderDataHydrated);
  actor.send({ type: NAVIGATION_EVENTS.SETTINGS_OPENED });
  actor.send({ type: BELIEF_LIBRARY_EVENTS.OPENED });
  actor.send({ type: REMINDER_EVENTS.HYDRATED, assignments: [{ ...editableAssignment, enabled }] });
  actor.send({ type: CHECK_IN_EVENTS.BELIEF_STATEMENTS_HYDRATED, statements: [{
    kind: 'custom', beliefSystemId: editableAssignment.beliefSystemId,
    harmfulStatement: 'I must never pause.', guidingStatement: 'I may take my time.',
  }] });
  actor.send({ type: REMINDER_EVENTS.ASSIGNMENT_EDIT_REQUESTED, assignmentId: editableAssignment.id });
  await waitFor(actor, (snapshot) => snapshot.matches(REMINDER_STATES.EDITOR));
  return actor;
}

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

  it('turns off the edited reminder, preserves saved timing, and exits to the library', async () => {
    const actor = await actorAtExistingEditor();
    await renderReminder(actor);
    await fireEvent.press(screen.getByTestId('reminder-time-add'));
    expect(actor.getSnapshot().context.reminderTimesDraft).toHaveLength(2);
    await fireEvent.press(screen.getByTestId('reminder-deactivate'));
    await waitFor(actor, (snapshot) => snapshot.matches(BELIEF_LIBRARY_STATES.LIBRARY));
    expect(actor.getSnapshot().context.reminderAssignments).toEqual([
      expect.objectContaining({ ...editableAssignment, enabled: false, updatedAt: expect.any(String) }),
    ]);
    expect(mockRequestReminderPermission).not.toHaveBeenCalled();
    actor.stop();
  });

  it.each(['storage', 'scheduler'])('keeps the editor retryable after a %s failure', async (failure) => {
    const actor = await actorAtExistingEditor();
    await renderReminder(actor);
    if (failure === 'storage') failNextSurrealUpsert(new Error('disk unavailable'));
    if (failure === 'scheduler') jest.mocked(reminderScheduler.reconcileReminderNotifications)
      .mockRejectedValueOnce(new Error('native cancellation failed'));
    await fireEvent.press(screen.getByTestId('reminder-deactivate'));
    expect(await screen.findByTestId('reminder-editor-error')).toHaveTextContent(
      'Your reminder could not be turned off. Please try again.',
    );
    expect(actor.getSnapshot().matches(REMINDER_STATES.EDITOR)).toBe(true);
    expect(actor.getSnapshot().context.reminderAssignments[0]?.enabled).toBe(true);
    await fireEvent.press(screen.getByTestId('reminder-deactivate'));
    await waitFor(actor, (snapshot) => snapshot.matches(BELIEF_LIBRARY_STATES.LIBRARY));
    expect(actor.getSnapshot().context.reminderAssignments[0]?.enabled).toBe(false);
    actor.stop();
  });

  it('keeps an off reminder off when saving timing edits', async () => {
    const actor = await actorAtExistingEditor({ enabled: false });
    await renderReminder(actor);
    expect(screen.queryByTestId('reminder-deactivate')).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('reminder-time-add'));
    await fireEvent.press(screen.getByTestId('reminder-save'));
    await waitFor(actor, (snapshot) => snapshot.matches(BELIEF_LIBRARY_STATES.LIBRARY));
    expect(actor.getSnapshot().context.reminderAssignments[0]).toMatchObject({ enabled: false });
    expect(actor.getSnapshot().context.reminderAssignments[0]?.times).toHaveLength(2);
    actor.stop();
  });

  it('shows saved timing in the overview even while the reminder is off', async () => {
    const actor = await actorAtExistingEditor({ enabled: false });
    actor.send({ type: NAVIGATION_EVENTS.BACK_REQUESTED });
    await render(<AppNavigationActorProvider actor={actor}><BeliefLibraryScreen /></AppNavigationActorProvider>);
    expect(screen.getByTestId('reminder-timing-summary')).toHaveTextContent('Mon, Wed, Fri · 09:03');
    expect(screen.getByText('Off')).toBeOnTheScreen();
    actor.stop();
  });

  it('ignores repeated deactivation while saving', async () => {
    const actor = await actorAtExistingEditor();
    let finishCancellation: (() => void) | undefined;
    jest.mocked(reminderScheduler.reconcileReminderNotifications).mockImplementationOnce(() => new Promise<void>((resolve) => {
      finishCancellation = resolve;
    }));
    actor.send({ type: REMINDER_EVENTS.DEACTIVATE_REQUESTED });
    await waitFor(actor, (snapshot) => snapshot.matches(REMINDER_STATES.SAVING));
    actor.send({ type: REMINDER_EVENTS.DEACTIVATE_REQUESTED });
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    if (!finishCancellation) throw new Error('Deactivation must reach notification cancellation');
    finishCancellation();
    await waitFor(actor, (snapshot) => snapshot.matches(BELIEF_LIBRARY_STATES.LIBRARY));
    expect(actor.getSnapshot().context.reminderAssignments[0]?.enabled).toBe(false);
    actor.stop();
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
