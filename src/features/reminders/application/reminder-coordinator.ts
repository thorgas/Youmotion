import * as Effect from 'effect/Effect';
import assert from '@/assert';

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

interface ActivateReminderInput {
  readonly assignments: ReadonlyArray<ReminderAssignment>;
  readonly locale: AppLocale;
  readonly notificationContent: ReminderNotificationContent;
  readonly now: Date;
  readonly statements: ReadonlyArray<BeliefStatement>;
  readonly target: ReminderTarget;
  readonly timing: ReminderTiming;
}

export async function activateReminder({
  assignments,
  locale,
  now,
  notificationContent,
  statements,
  target,
  timing,
}: ActivateReminderInput) {
  assert(timing.weekdays.length > 0, 'Activated reminder requires weekdays');
  assert(timing.times.length > 0, 'Activated reminder requires times');
  const timestamp = ReminderTimestamp.make(now.toISOString());
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
        id: existing?.id ?? createReminderAssignmentId({ timestamp: now.getTime(), nonce: Math.random().toString(16).slice(2) }),
        schemaVersion: 2,
        ...normalizedTiming,
        targetKind: target.targetKind,
        enabled: true,
        createdAt: existing?.createdAt ?? timestamp,
        updatedAt: timestamp,
      }
    : {
        id: existing?.id ?? createReminderAssignmentId({ timestamp: now.getTime(), nonce: Math.random().toString(16).slice(2) }),
        schemaVersion: 2,
        ...normalizedTiming,
        targetKind: target.targetKind,
        beliefSystemId: target.beliefSystemId,
        enabled: true,
        notificationContent,
        createdAt: existing?.createdAt ?? timestamp,
        updatedAt: timestamp,
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
  assert(nextAssignments.some((candidate) => candidate.id === assignment.id), 'Activated reminder must be present');
  assert(assignment.enabled, 'Activated reminder must be enabled');
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
  assert(assignments.some((candidate) => candidate.id === assignment.id), 'Updated reminder must exist');
  assert(timing.weekdays.length > 0 && timing.times.length > 0, 'Updated reminder requires a complete timing');
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
  assert(nextAssignments.length === assignments.length, 'Updating cannot change assignment count');
  assert(nextAssignments.some((candidate) => candidate === updatedAssignment), 'Updated reminder must replace its prior value');
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
  assert(assignments.some((candidate) => candidate.id === assignment.id), 'Toggled reminder must exist');
  assert(assignment.id.length > 0, 'Toggled reminder id must not be empty');
  const updated: ReminderAssignment = {
    ...assignment,
    enabled,
    updatedAt: ReminderTimestamp.make(new Date().toISOString()),
  };
  await Effect.runPromise(persistReminderAssignment(updated));
  const nextAssignments = assignments.map((candidate) => (
    candidate.id === updated.id ? updated : candidate
  ));
  assert(nextAssignments.length === assignments.length, 'Toggling cannot change assignment count');
  assert(nextAssignments.some((candidate) => candidate === updated), 'Toggled reminder must replace its prior value');
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
  assert(assignments.some((candidate) => candidate.id === assignment.id), 'Deleted reminder must exist');
  assert(assignment.id.length > 0, 'Deleted reminder id must not be empty');
  const nextAssignments = assignments.filter((candidate) => candidate.id !== assignment.id);
  assert(nextAssignments.length < assignments.length, 'Deleting must reduce assignment count');
  assert(nextAssignments.every((candidate) => candidate.id !== assignment.id), 'Deleted reminder must be absent');
  await Effect.runPromise(deleteReminderAssignment(assignment.id));
  await reconcileReminderNotifications({
    assignments: nextAssignments,
    locale,
    statements,
  });
  return nextAssignments;
}
