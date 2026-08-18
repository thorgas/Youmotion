import * as Effect from 'effect/Effect';

import { REMINDER_TARGET_KINDS } from '@/constants';
import type {
  BeliefStatement,
  BeliefSystemId,
} from '@/features/check-in/domain/belief-statement';
import type { AppLocale } from '@/features/settings/domain/app-locale';
import {
  createReminderAssignmentId,
  ReminderTimestamp,
  type ReminderAssignment,
  type ReminderNotificationContent,
} from '../domain/reminder-assignment';
import {
  normalizedReminderTiming,
  type ReminderTiming,
} from '../domain/reminder-timing';
import {
  deleteReminderAssignment,
  persistReminderAssignment,
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
  notificationContent,
  statements,
  target,
  timing,
}: {
  assignments: readonly ReminderAssignment[];
  locale: AppLocale;
  notificationContent: ReminderNotificationContent;
  statements: readonly BeliefStatement[];
  target: ReminderTarget;
  timing: ReminderTiming;
}) {
  const now = ReminderTimestamp.make(new Date().toISOString());
  const normalizedTiming = normalizedReminderTiming(timing);
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
        schemaVersion: 2,
        ...normalizedTiming,
        targetKind: target.targetKind,
        enabled: true,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      }
    : {
        id: existing?.id ?? createReminderAssignmentId({ timestamp: Date.now(), nonce: Math.random().toString(16).slice(2) }),
        schemaVersion: 2,
        ...normalizedTiming,
        targetKind: target.targetKind,
        beliefSystemId: target.beliefSystemId,
        enabled: true,
        notificationContent,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
  await Effect.runPromise(persistReminderAssignment(assignment));
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
    statements,
  });
  return { assignment, assignments: nextAssignments };
}

export async function updateReminder({
  assignment,
  assignments,
  locale,
  notificationContent,
  statements,
  timing,
}: {
  assignment: ReminderAssignment;
  assignments: readonly ReminderAssignment[];
  locale: AppLocale;
  notificationContent: ReminderNotificationContent;
  statements: readonly BeliefStatement[];
  timing: ReminderTiming;
}) {
  const now = ReminderTimestamp.make(new Date().toISOString());
  const normalizedTiming = normalizedReminderTiming(timing);
  const updatedAssignment: ReminderAssignment = assignment.targetKind
    === REMINDER_TARGET_KINDS.GUIDING_BELIEF
    ? {
        ...assignment,
        ...normalizedTiming,
        notificationContent,
        updatedAt: now,
      }
    : { ...assignment, ...normalizedTiming, updatedAt: now };
  await Effect.runPromise(persistReminderAssignment(updatedAssignment));
  const nextAssignments = assignments.map((candidate) => (
    candidate.id === updatedAssignment.id ? updatedAssignment : candidate
  ));
  await reconcileReminderNotifications({
    assignments: nextAssignments,
    locale,
    statements,
  });
  return nextAssignments;
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
  statements,
}: {
  assignment: ReminderAssignment;
  assignments: readonly ReminderAssignment[];
  enabled: boolean;
  locale: AppLocale;
  statements: readonly BeliefStatement[];
}) {
  const updated: ReminderAssignment = {
    ...assignment,
    enabled,
    updatedAt: ReminderTimestamp.make(new Date().toISOString()),
  };
  await Effect.runPromise(persistReminderAssignment(updated));
  const nextAssignments = assignments.map((candidate) => (
    candidate.id === updated.id ? updated : candidate
  ));
  await reconcileReminderNotifications({
    assignments: nextAssignments,
    locale,
    statements,
  });
  return nextAssignments;
}

export async function deleteReminder({
  assignment,
  assignments,
  locale,
  statements,
}: {
  assignment: ReminderAssignment;
  assignments: readonly ReminderAssignment[];
  locale: AppLocale;
  statements: readonly BeliefStatement[];
}) {
  const nextAssignments = assignments.filter((candidate) => candidate.id !== assignment.id);
  await Effect.runPromise(deleteReminderAssignment(assignment.id));
  await reconcileReminderNotifications({
    assignments: nextAssignments,
    locale,
    statements,
  });
  return nextAssignments;
}
