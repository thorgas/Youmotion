import {
  APP_LOCALES,
  REMINDER_TARGET_KINDS,
} from '@/constants';
import {
  CustomBeliefSystemId,
  type BeliefStatement,
} from '@/features/check-in/domain/belief-statement';
import {
  ReminderAssignmentId,
  type ReminderAssignment,
} from '../domain/reminder-assignment';
import {
  ReminderScheduleId,
  ReminderScheduleTimestamp,
  type ReminderSchedule,
} from '../domain/reminder-schedule';
import {
  activateReminder,
  setReminderAssignmentEnabled,
} from '../application/reminder-coordinator';
import * as reminderRepository from '../infrastructure/reminder.repository';
import * as reminderScheduler from '../infrastructure/local-reminder.scheduler';

jest.mock('../infrastructure/reminder.repository', () => {
  const effect = jest.requireActual<typeof import('effect/Effect')>('effect/Effect');
  return {
    persistReminderAssignment: jest.fn(() => effect.void),
    persistReminderSchedule: jest.fn(() => effect.void),
  };
});

jest.mock('../infrastructure/local-reminder.scheduler', () => ({
  reconcileReminderNotifications: jest.fn(() => Promise.resolve()),
}));

const persistedAssignment = jest.mocked(reminderRepository.persistReminderAssignment);
const reconcile = jest.mocked(reminderScheduler.reconcileReminderNotifications);
const createdAt = ReminderScheduleTimestamp.make('2026-08-13T08:00:00.000Z');
const beliefSystemId = CustomBeliefSystemId.make('custom-support');
const previousScheduleId = ReminderScheduleId.make('previous');
const schedule = {
  id: ReminderScheduleId.make('weekdays'),
  schemaVersion: 1,
  name: 'Weekdays',
  weekdays: [2, 3, 4, 5, 6],
  times: [{ hour: 9, minute: 0 }, { hour: 18, minute: 0 }],
  createdAt,
  updatedAt: createdAt,
} satisfies ReminderSchedule;
const existing = {
  id: ReminderAssignmentId.make('positive-assignment'),
  schemaVersion: 1,
  scheduleId: previousScheduleId,
  targetKind: REMINDER_TARGET_KINDS.GUIDING_BELIEF,
  beliefSystemId,
  enabled: false,
  showFullText: false,
  createdAt,
  updatedAt: createdAt,
} satisfies ReminderAssignment;
const statements = [{
  kind: 'custom',
  beliefSystemId,
  harmfulStatement: 'I must do this alone.',
  guidingStatement: 'I can receive support.',
}] satisfies readonly BeliefStatement[];

describe('reminder coordinator', () => {
  beforeEach(() => jest.clearAllMocks());

  it('reuses the assignment identity when a positive Leitsatz selects another schedule', async () => {
    const result = await activateReminder({
      assignments: [existing],
      locale: APP_LOCALES.ENGLISH,
      schedule,
      schedules: [],
      statements,
      target: { targetKind: REMINDER_TARGET_KINDS.GUIDING_BELIEF, beliefSystemId },
    });

    expect(result.assignments).toHaveLength(1);
    expect(result.assignment).toMatchObject({
      id: existing.id,
      scheduleId: schedule.id,
      enabled: true,
      createdAt,
    });
    expect(persistedAssignment).toHaveBeenCalledWith(result.assignment);
    expect(reconcile).toHaveBeenCalledWith(expect.objectContaining({
      assignments: result.assignments,
      schedules: [schedule],
    }));
  });

  it('persists an off assignment before canceling its native projection', async () => {
    const assignments = await setReminderAssignmentEnabled({
      assignment: { ...existing, enabled: true },
      assignments: [{ ...existing, enabled: true }],
      enabled: false,
      locale: APP_LOCALES.ENGLISH,
      schedules: [schedule],
      statements,
    });

    expect(assignments).toEqual([expect.objectContaining({ id: existing.id, enabled: false })]);
    expect(persistedAssignment).toHaveBeenCalledWith(expect.objectContaining({
      id: existing.id,
      enabled: false,
    }));
    expect(reconcile).toHaveBeenCalledWith(expect.objectContaining({ assignments }));
  });
});
