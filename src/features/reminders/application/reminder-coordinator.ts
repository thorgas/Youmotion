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
  ReminderScheduleTimestamp,
  type ReminderSchedule,
} from '../domain/reminder-schedule';
import {
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
        scheduleId: schedule.id,
        targetKind: target.targetKind,
        enabled: true,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      }
    : {
        id: existing?.id ?? createReminderAssignmentId({ timestamp: Date.now(), nonce: Math.random().toString(16).slice(2) }),
        schemaVersion: 1,
        scheduleId: schedule.id,
        targetKind: target.targetKind,
        beliefSystemId: target.beliefSystemId,
        enabled: true,
        showFullText: false,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
  await Effect.runPromise(persistReminderSchedule(schedule));
  await Effect.runPromise(persistReminderAssignment(assignment));
  const nextSchedules = schedules.some((candidate) => candidate.id === schedule.id)
    ? schedules.map((candidate) => candidate.id === schedule.id ? schedule : candidate)
    : [...schedules, schedule];
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
