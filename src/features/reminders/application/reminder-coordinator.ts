import * as Effect from 'effect/Effect';

import {
  REMINDER_TARGET_KINDS,
} from '@/constants';
import type {
  BeliefStatement,
  BeliefSystemId,
} from '@/features/check-in/domain/belief-statement';
import type { AppLocale } from '@/features/settings/domain/app-locale';
import {
  createReminderAssignmentId,
  type ReminderAssignment,
} from '../domain/reminder-assignment';
import {
  createReminderScheduleId,
  ReminderScheduleTimestamp,
  type ReminderSchedule,
} from '../domain/reminder-schedule';
import {
  deleteReminderAssignment,
  deleteReminderSchedule,
  persistReminderAssignment,
  persistReminderSchedule,
} from '../infrastructure/reminder.repository';
import { reconcileReminderNotifications } from '../infrastructure/local-reminder.scheduler';

export type ReminderTarget =
  | { targetKind: typeof REMINDER_TARGET_KINDS.PULSE }
  | {
      targetKind: typeof REMINDER_TARGET_KINDS.GUIDING_BELIEF;
      beliefSystemId: BeliefSystemId;
    };

export async function activateReminder({
  assignments,
  locale,
  schedule,
  schedules,
  statements,
  target,
}: {
  assignments: readonly ReminderAssignment[];
  locale: AppLocale;
  schedule: ReminderSchedule;
  schedules: readonly ReminderSchedule[];
  statements: readonly BeliefStatement[];
  target: ReminderTarget;
}) {
  const now = ReminderScheduleTimestamp.make(new Date().toISOString());
  const ownedSchedule: ReminderSchedule = {
    ...schedule,
    id: createReminderScheduleId({
      timestamp: Date.now(),
      nonce: Math.random().toString(16).slice(2),
    }),
    createdAt: now,
    updatedAt: now,
  };
  const existing = assignments.find((candidate) => (
    candidate.targetKind === target.targetKind
    && (
      target.targetKind === REMINDER_TARGET_KINDS.PULSE
      || (
        candidate.targetKind === REMINDER_TARGET_KINDS.GUIDING_BELIEF
        && candidate.beliefSystemId === target.beliefSystemId
      )
    )
  ));
  const assignment: ReminderAssignment = target.targetKind === REMINDER_TARGET_KINDS.PULSE
    ? {
        id: existing?.id ?? createReminderAssignmentId({ timestamp: Date.now(), nonce: Math.random().toString(16).slice(2) }),
        schemaVersion: 1,
        scheduleId: ownedSchedule.id,
        targetKind: target.targetKind,
        enabled: true,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      }
    : {
        id: existing?.id ?? createReminderAssignmentId({ timestamp: Date.now(), nonce: Math.random().toString(16).slice(2) }),
        schemaVersion: 1,
        scheduleId: ownedSchedule.id,
        targetKind: target.targetKind,
        beliefSystemId: target.beliefSystemId,
        enabled: true,
        showFullText: false,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
  await Effect.runPromise(persistReminderSchedule(ownedSchedule));
  await Effect.runPromise(persistReminderAssignment(assignment));
  const nextSchedules = [...schedules, ownedSchedule];
  const nextAssignments = assignments
    .filter((candidate) => (
      candidate.targetKind !== target.targetKind
      || (
        target.targetKind === REMINDER_TARGET_KINDS.GUIDING_BELIEF
        && candidate.targetKind === REMINDER_TARGET_KINDS.GUIDING_BELIEF
        && candidate.beliefSystemId !== target.beliefSystemId
      )
    ))
    .concat(assignment);
  await reconcileReminderNotifications({
    assignments: nextAssignments,
    locale,
    schedules: nextSchedules,
    statements,
  });
  return { assignment, schedules: nextSchedules, assignments: nextAssignments };
}

export async function updateReminderSchedule({
  assignment,
  assignments,
  locale,
  schedule,
  schedules,
  statements,
}: {
  assignment: ReminderAssignment;
  assignments: readonly ReminderAssignment[];
  locale: AppLocale;
  schedule: ReminderSchedule;
  schedules: readonly ReminderSchedule[];
  statements: readonly BeliefStatement[];
}) {
  const now = ReminderScheduleTimestamp.make(new Date().toISOString());
  const shared = assignments.some((candidate) => (
    candidate.id !== assignment.id && candidate.scheduleId === assignment.scheduleId
  ));
  const updatedSchedule: ReminderSchedule = shared
    ? {
        ...schedule,
        id: createReminderScheduleId({
          timestamp: Date.now(),
          nonce: Math.random().toString(16).slice(2),
        }),
        createdAt: now,
        updatedAt: now,
      }
    : schedule;
  const updatedAssignment: ReminderAssignment = shared
    ? { ...assignment, scheduleId: updatedSchedule.id, updatedAt: now }
    : assignment;
  await Effect.runPromise(persistReminderSchedule(updatedSchedule));
  if (shared) await Effect.runPromise(persistReminderAssignment(updatedAssignment));
  const nextSchedules = shared
    ? [...schedules, updatedSchedule]
    : schedules.map((candidate) => (
        candidate.id === updatedSchedule.id ? updatedSchedule : candidate
      ));
  const nextAssignments = assignments.map((candidate) => (
    candidate.id === updatedAssignment.id ? updatedAssignment : candidate
  ));
  await reconcileReminderNotifications({
    assignments: nextAssignments,
    locale,
    schedules: nextSchedules,
    statements,
  });
  return { assignments: nextAssignments, schedules: nextSchedules };
}

export function assignmentForTarget({
  assignments,
  beliefSystemId,
}: {
  assignments: readonly ReminderAssignment[];
  beliefSystemId: BeliefSystemId;
}) {
  return assignments.find((assignment) => (
    assignment.targetKind === REMINDER_TARGET_KINDS.GUIDING_BELIEF
    && assignment.beliefSystemId === beliefSystemId
  ));
}

export async function setReminderAssignmentEnabled({
  assignment,
  assignments,
  enabled,
  locale,
  schedules,
  statements,
}: {
  assignment: ReminderAssignment;
  assignments: readonly ReminderAssignment[];
  enabled: boolean;
  locale: AppLocale;
  schedules: readonly ReminderSchedule[];
  statements: readonly BeliefStatement[];
}) {
  const updated: ReminderAssignment = {
    ...assignment,
    enabled,
    updatedAt: ReminderScheduleTimestamp.make(new Date().toISOString()),
  };
  await Effect.runPromise(persistReminderAssignment(updated));
  const nextAssignments = assignments.map((candidate) => (
    candidate.id === updated.id ? updated : candidate
  ));
  await reconcileReminderNotifications({
    assignments: nextAssignments,
    locale,
    schedules,
    statements,
  });
  return nextAssignments;
}

export async function deleteReminder({
  assignment,
  assignments,
  locale,
  schedules,
  statements,
}: {
  assignment: ReminderAssignment;
  assignments: readonly ReminderAssignment[];
  locale: AppLocale;
  schedules: readonly ReminderSchedule[];
  statements: readonly BeliefStatement[];
}) {
  const nextAssignments = assignments.filter((candidate) => candidate.id !== assignment.id);
  const scheduleStillUsed = nextAssignments.some(
    (candidate) => candidate.scheduleId === assignment.scheduleId,
  );
  const nextSchedules = scheduleStillUsed
    ? schedules
    : schedules.filter((schedule) => schedule.id !== assignment.scheduleId);
  await Effect.runPromise(deleteReminderAssignment(assignment.id));
  if (!scheduleStillUsed) {
    await Effect.runPromise(deleteReminderSchedule(assignment.scheduleId));
  }
  await reconcileReminderNotifications({
    assignments: nextAssignments,
    locale,
    schedules: nextSchedules,
    statements,
  });
  return { assignments: nextAssignments, schedules: nextSchedules };
}
