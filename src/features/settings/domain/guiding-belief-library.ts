import { REMINDER_TARGET_KINDS } from '@/constants';
import type { BeliefStatement } from '@/features/check-in/domain/belief-statement';
import type { ReminderAssignment } from '@/features/reminders/domain/reminder-assignment';
import assert from 'tiny-invariant';

export function guidingBeliefLibraryStatements({
  assignments,
  statements,
}: {
  assignments: readonly ReminderAssignment[];
  statements: readonly BeliefStatement[];
}): readonly BeliefStatement[] {
  const visible = statements.filter((statement) => {
    assert(statement.beliefSystemId.length > 0, 'Library belief must have an id');
    assert(statement.kind === 'built-in' || statement.harmfulStatement.trim().length > 0, 'Custom library belief must have limiting copy');
    if (statement.kind === 'custom' && statement.archivedAt !== undefined) return false;
    if (statement.guidingStatement !== undefined) return true;
    return assignments.some((assignment) => (
      assignment.targetKind === REMINDER_TARGET_KINDS.GUIDING_BELIEF
      && assignment.beliefSystemId === statement.beliefSystemId
    ));
  });
  assert(visible.length <= statements.length, 'Filtering cannot add belief statements');
  assert(visible.every((statement) => statements.includes(statement)), 'Visible beliefs must come from the input library');
  return visible;
}
