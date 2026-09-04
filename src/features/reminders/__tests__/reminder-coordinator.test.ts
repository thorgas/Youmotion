import {
  APP_LOCALES,
  REMINDER_NOTIFICATION_CONTENT,
  REMINDER_TARGET_KINDS,
} from '@/constants';
import {
  CustomBeliefSystemId,
  type BeliefStatement,
} from '@/features/beliefs/domain/belief-statement';
import {
  activateReminder,
  deleteReminder,
  setReminderAssignmentEnabled,
  updateReminder,
} from '../application/reminder-coordinator';
import {
  ReminderAssignmentId,
  ReminderTimestamp,
  type ReminderAssignment,
} from '../domain/reminder-assignment';
import * as reminderRepository from '../infrastructure/reminder.repository';
import * as reminderScheduler from '../infrastructure/local-reminder.scheduler';

jest.mock('../infrastructure/reminder.repository', () => {
  const effect = jest.requireActual<typeof import('effect/Effect')>('effect/Effect');
  return {
    deleteReminderAssignment: jest.fn(() => effect.void),
    persistReminderAssignment: jest.fn(() => effect.void),
  };
});

jest.mock('../infrastructure/local-reminder.scheduler', () => ({
  reconcileReminderNotifications: jest.fn(() => Promise.resolve()),
}));

const persistedAssignment = jest.mocked(reminderRepository.persistReminderAssignment);
const deletedAssignment = jest.mocked(reminderRepository.deleteReminderAssignment);
const reconcile = jest.mocked(reminderScheduler.reconcileReminderNotifications);
const createdAt = ReminderTimestamp.make('2026-08-18T08:00:00.000Z');
const beliefSystemId = CustomBeliefSystemId.make('custom-support');
const existing = {
  id: ReminderAssignmentId.make('positive-assignment'),
  schemaVersion: 2,
  targetKind: REMINDER_TARGET_KINDS.GUIDING_BELIEF,
  beliefSystemId,
  enabled: false,
  weekdays: [2],
  times: [{ hour: 8, minute: 0 }],
  notificationContent: REMINDER_NOTIFICATION_CONTENT.GENERAL,
  createdAt,
  updatedAt: createdAt,
} satisfies ReminderAssignment;
const statements = [{
  kind: 'custom',
  beliefSystemId,
  harmfulStatement: 'I must always function.',
  guidingStatement: 'I may pause.',
}] satisfies readonly BeliefStatement[];

describe('reminder coordinator', () => {
  beforeEach(() => jest.clearAllMocks());

  it('activates a target by replacing only its owned reminder data', async () => {
    const result = await activateReminder({
      assignments: [existing],
      locale: APP_LOCALES.ENGLISH,
      nonce: 'activation-test',
      now: new Date('2026-08-25T12:00:00.000Z'),
      notificationContent: REMINDER_NOTIFICATION_CONTENT.LEITSATZ,
      statements,
      target: { targetKind: REMINDER_TARGET_KINDS.GUIDING_BELIEF, beliefSystemId },
      timing: {
        weekdays: [6, 2, 2],
        times: [{ hour: 18, minute: 0 }, { hour: 9, minute: 0 }],
      },
    });

    expect(result.assignment).toMatchObject({
      id: existing.id,
      schemaVersion: 2,
      enabled: true,
      weekdays: [2, 6],
      times: [{ hour: 9, minute: 0 }, { hour: 18, minute: 0 }],
      notificationContent: REMINDER_NOTIFICATION_CONTENT.LEITSATZ,
    });
    expect(persistedAssignment).toHaveBeenCalledWith(result.assignment);
    expect(reconcile).toHaveBeenCalledWith({
      assignments: result.assignments,
      locale: APP_LOCALES.ENGLISH,
      statements,
    });
  });

  it('updates inline timing and content without changing another reminder', async () => {
    const other = {
      ...existing,
      id: ReminderAssignmentId.make('other-assignment'),
      beliefSystemId: CustomBeliefSystemId.make('custom-other'),
    };
    const result = await updateReminder({
      assignment: existing,
      assignments: [existing, other],
      locale: APP_LOCALES.ENGLISH,
      now: new Date('2026-08-25T13:00:00.000Z'),
      notificationContent: REMINDER_NOTIFICATION_CONTENT.LEITSATZ,
      statements,
      timing: { weekdays: [1, 7], times: [{ hour: 20, minute: 30 }] },
    });

    expect(result[0]).toMatchObject({
      weekdays: [1, 7],
      times: [{ hour: 20, minute: 30 }],
      notificationContent: REMINDER_NOTIFICATION_CONTENT.LEITSATZ,
    });
    expect(result[1]).toBe(other);
  });

  it('toggles and deletes only the selected assignment', async () => {
    const toggled = await setReminderAssignmentEnabled({
      assignment: existing,
      assignments: [existing],
      enabled: true,
      locale: APP_LOCALES.ENGLISH,
      now: new Date('2026-08-25T14:00:00.000Z'),
      statements,
    });
    expect(toggled[0]?.enabled).toBe(true);

    const deleted = await deleteReminder({
      assignment: existing,
      assignments: [existing],
      locale: APP_LOCALES.ENGLISH,
      statements,
    });
    expect(deleted).toEqual([]);
    expect(deletedAssignment).toHaveBeenCalledWith(existing.id);
  });
});
