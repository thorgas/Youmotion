import { REMINDER_TARGET_KINDS } from '@/constants';
import type { BeliefStatement } from '@/features/check-in/domain/belief-statement';
import type { ReminderAssignment } from '@/features/reminders/domain/reminder-assignment';

export function guidingBeliefLibraryStatements({
  assignments,
  statements,
}: {
  assignments: readonly ReminderAssignment[];
  statements: readonly BeliefStatement[];
}): readonly BeliefStatement[] {
  return statements.filter((statement) => {
    if (statement.kind === 'custom' && statement.archivedAt !== undefined) return false;
    if (statement.guidingStatement !== undefined) return true;
    return assignments.some((assignment) => (
      assignment.targetKind === REMINDER_TARGET_KINDS.GUIDING_BELIEF
      && assignment.beliefSystemId === statement.beliefSystemId
    ));
  });
}
