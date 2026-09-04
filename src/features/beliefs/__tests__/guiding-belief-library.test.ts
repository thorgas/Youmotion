import {
  BELIEF_SYSTEM_IDS,
  REMINDER_NOTIFICATION_CONTENT,
  REMINDER_TARGET_KINDS,
} from '@/constants';
import {
  BeliefStatementArchiveTimestamp,
  CustomBeliefSystemId,
  type BeliefStatement,
} from '@/features/beliefs/domain/belief-statement';
import {
  ReminderAssignmentId,
  ReminderTimestamp,
  type ReminderAssignment,
} from '@/features/reminders/domain/reminder-assignment';
import { guidingBeliefLibraryStatements } from '../application/guiding-belief-library';

const timestamp = ReminderTimestamp.make('2026-08-18T09:00:00.000Z');
const authoredId = CustomBeliefSystemId.make('custom-authored');
const reminderOnlyId = CustomBeliefSystemId.make('custom-reminder-only');

const guidingBeliefReminderFor = (
  beliefSystemId: BeliefStatement['beliefSystemId'],
): ReminderAssignment => ({
  id: ReminderAssignmentId.make(`reminder-${beliefSystemId}`),
  schemaVersion: 2,
  targetKind: REMINDER_TARGET_KINDS.GUIDING_BELIEF,
  beliefSystemId,
  weekdays: [2, 3, 4, 5, 6],
  times: [{ hour: 9, minute: 0 }],
  notificationContent: REMINDER_NOTIFICATION_CONTENT.GENERAL,
  enabled: true,
  createdAt: timestamp,
  updatedAt: timestamp,
});

const pulseReminder: ReminderAssignment = {
  id: ReminderAssignmentId.make('reminder-pulse'),
  schemaVersion: 2,
  targetKind: REMINDER_TARGET_KINDS.PULSE,
  weekdays: [2, 3, 4, 5, 6],
  times: [{ hour: 9, minute: 0 }],
  enabled: true,
  createdAt: timestamp,
  updatedAt: timestamp,
};

describe('guiding belief library statements', () => {
  it('keeps a suggested belief the user gave a guiding belief', () => {
    const suggested: BeliefStatement = {
      kind: 'built-in',
      beliefSystemId: BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING,
      guidingStatement: 'I may pause and still be enough.',
    };

    expect(guidingBeliefLibraryStatements({
      assignments: [],
      statements: [suggested],
    })).toEqual([suggested]);
  });

  it('keeps an authored belief that carries a guiding belief', () => {
    const authored: BeliefStatement = {
      kind: 'custom',
      beliefSystemId: authoredId,
      harmfulStatement: 'I must never need help.',
      guidingStatement: 'I can ask for support.',
    };

    expect(guidingBeliefLibraryStatements({
      assignments: [],
      statements: [authored],
    })).toEqual([authored]);
  });

  it('keeps a belief whose guiding belief was cleared while its reminder remains', () => {
    const reminderOnly: BeliefStatement = {
      kind: 'custom',
      beliefSystemId: reminderOnlyId,
      harmfulStatement: 'I must always stay strong.',
    };

    expect(guidingBeliefLibraryStatements({
      assignments: [guidingBeliefReminderFor(reminderOnlyId)],
      statements: [reminderOnly],
    })).toEqual([reminderOnly]);
  });

  it('drops a belief with neither a guiding belief nor a reminder', () => {
    expect(guidingBeliefLibraryStatements({
      assignments: [],
      statements: [{
        kind: 'custom',
        beliefSystemId: reminderOnlyId,
        harmfulStatement: 'I must always stay strong.',
      }],
    })).toEqual([]);
  });

  it('does not let a Pulse reminder keep an unreframed belief in the library', () => {
    expect(guidingBeliefLibraryStatements({
      assignments: [pulseReminder],
      statements: [{
        kind: 'custom',
        beliefSystemId: reminderOnlyId,
        harmfulStatement: 'I must always stay strong.',
      }],
    })).toEqual([]);
  });

  it('does not let another belief reminder keep an unreframed belief in the library', () => {
    expect(guidingBeliefLibraryStatements({
      assignments: [guidingBeliefReminderFor(authoredId)],
      statements: [{
        kind: 'custom',
        beliefSystemId: reminderOnlyId,
        harmfulStatement: 'I must always stay strong.',
      }],
    })).toEqual([]);
  });

  it('drops an archived belief even when it still has a guiding belief and a reminder', () => {
    expect(guidingBeliefLibraryStatements({
      assignments: [guidingBeliefReminderFor(authoredId)],
      statements: [{
        kind: 'custom',
        beliefSystemId: authoredId,
        harmfulStatement: 'I must never need help.',
        guidingStatement: 'I can ask for support.',
        archivedAt: BeliefStatementArchiveTimestamp.make('2026-08-18T09:00:00.000Z'),
      }],
    })).toEqual([]);
  });
});
