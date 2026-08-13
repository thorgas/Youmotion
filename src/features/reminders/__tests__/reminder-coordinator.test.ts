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
  deleteReminder,
  setReminderAssignmentEnabled,
  updateReminderSchedule,
} from '../application/reminder-coordinator';
import * as reminderRepository from '../infrastructure/reminder.repository';
import * as reminderScheduler from '../infrastructure/local-reminder.scheduler';

jest.mock('../infrastructure/reminder.repository', () => {
  const effect = jest.requireActual<typeof import('effect/Effect')>('effect/Effect');
  return {
    deleteReminderAssignment: jest.fn(() => effect.void),
    deleteReminderSchedule: jest.fn(() => effect.void),
    persistReminderAssignment: jest.fn(() => effect.void),
    persistReminderSchedule: jest.fn(() => effect.void),
  };
});

jest.mock('../infrastructure/local-reminder.scheduler', () => ({
  reconcileReminderNotifications: jest.fn(() => Promise.resolve()),
}));

const persistedAssignment = jest.mocked(reminderRepository.persistReminderAssignment);
const persistedSchedule = jest.mocked(reminderRepository.persistReminderSchedule);
const deletedAssignment = jest.mocked(reminderRepository.deleteReminderAssignment);
const deletedSchedule = jest.mocked(reminderRepository.deleteReminderSchedule);
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

  it('reuses the assignment identity and copies a selected schedule', async () => {
    const result = await activateReminder({
      assignments: [existing],
      locale: APP_LOCALES.ENGLISH,
      schedule,
      schedules: [],
      showFullText: true,
      statements,
      target: { targetKind: REMINDER_TARGET_KINDS.GUIDING_BELIEF, beliefSystemId },
    });

    expect(result.assignments).toHaveLength(1);
    expect(result.assignment).toMatchObject({
      id: existing.id,
      enabled: true,
      createdAt,
      showFullText: true,
    });
    expect(result.assignment.scheduleId).not.toBe(schedule.id);
    expect(result.schedules).toEqual([
      expect.objectContaining({ id: result.assignment.scheduleId, name: schedule.name }),
    ]);
    expect(persistedSchedule).toHaveBeenCalledWith(result.schedules[0]);
    expect(persistedAssignment).toHaveBeenCalledWith(result.assignment);
    expect(reconcile).toHaveBeenCalledWith(expect.objectContaining({
      assignments: result.assignments,
      schedules: result.schedules,
    }));
  });

  it('separates legacy shared schedules before editing one reminder', async () => {
    const pulse = {
      id: ReminderAssignmentId.make('pulse-assignment'),
      schemaVersion: 1,
      scheduleId: schedule.id,
      targetKind: REMINDER_TARGET_KINDS.PULSE,
      enabled: true,
      createdAt,
      updatedAt: createdAt,
    } satisfies ReminderAssignment;
    const guiding = { ...existing, scheduleId: schedule.id };
    const edited = { ...schedule, name: 'Only this reminder' };

    const result = await updateReminderSchedule({
      assignment: pulse,
      assignments: [pulse, guiding],
      locale: APP_LOCALES.ENGLISH,
      schedule: edited,
      schedules: [schedule],
      showFullText: false,
      statements,
    });

    expect(result.assignments[0]?.scheduleId).not.toBe(schedule.id);
    expect(result.assignments[1]?.scheduleId).toBe(schedule.id);
    expect(result.schedules).toEqual([
      schedule,
      expect.objectContaining({ name: 'Only this reminder' }),
    ]);
    expect(persistedAssignment).toHaveBeenCalledWith(result.assignments[0]);
    expect(reconcile).toHaveBeenCalledWith(expect.objectContaining({
      assignments: result.assignments,
      schedules: result.schedules,
    }));
  });

  it('preserves the owned schedule identity when editing it', async () => {
    const owned = { ...existing, scheduleId: schedule.id };
    const edited = { ...schedule, name: 'A calmer morning' };

    const result = await updateReminderSchedule({
      assignment: owned,
      assignments: [owned],
      locale: APP_LOCALES.ENGLISH,
      schedule: edited,
      schedules: [schedule],
      showFullText: false,
      statements,
    });

    expect(result.assignments).toEqual([owned]);
    expect(result.schedules).toEqual([edited]);
    expect(persistedAssignment).not.toHaveBeenCalled();
    expect(persistedSchedule).toHaveBeenCalledWith(edited);
  });

  it('persists a preview choice on its guiding Leitsatz reminder', async () => {
    const owned = { ...existing, scheduleId: schedule.id };

    const result = await updateReminderSchedule({
      assignment: owned,
      assignments: [owned],
      locale: APP_LOCALES.ENGLISH,
      schedule,
      schedules: [schedule],
      showFullText: true,
      statements,
    });

    expect(result.assignments).toEqual([
      expect.objectContaining({ id: owned.id, showFullText: true }),
    ]);
    expect(persistedAssignment).toHaveBeenCalledWith(
      expect.objectContaining({ id: owned.id, showFullText: true }),
    );
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

  it('deletes one reminder and its unused owned schedule before reconciling', async () => {
    const owned = { ...existing, scheduleId: schedule.id };

    const result = await deleteReminder({
      assignment: owned,
      assignments: [owned],
      locale: APP_LOCALES.ENGLISH,
      schedules: [schedule],
      statements,
    });

    expect(result).toEqual({ assignments: [], schedules: [] });
    expect(deletedAssignment).toHaveBeenCalledWith(owned.id);
    expect(deletedSchedule).toHaveBeenCalledWith(schedule.id);
    expect(reconcile).toHaveBeenCalledWith(expect.objectContaining({
      assignments: [],
      schedules: [],
    }));
  });

  it('preserves a legacy shared schedule when deleting one reminder', async () => {
    const pulse = {
      id: ReminderAssignmentId.make('pulse-assignment'),
      schemaVersion: 1,
      scheduleId: schedule.id,
      targetKind: REMINDER_TARGET_KINDS.PULSE,
      enabled: true,
      createdAt,
      updatedAt: createdAt,
    } satisfies ReminderAssignment;
    const guiding = { ...existing, scheduleId: schedule.id };

    const result = await deleteReminder({
      assignment: guiding,
      assignments: [pulse, guiding],
      locale: APP_LOCALES.ENGLISH,
      schedules: [schedule],
      statements,
    });

    expect(result).toEqual({ assignments: [pulse], schedules: [schedule] });
    expect(deletedAssignment).toHaveBeenCalledWith(guiding.id);
    expect(deletedSchedule).not.toHaveBeenCalled();
  });
});
