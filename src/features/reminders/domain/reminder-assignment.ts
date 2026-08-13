import * as Schema from 'effect/Schema';

import { REMINDER_TARGET_KINDS } from '@/constants';
import { BeliefSystemId } from '@/features/check-in/domain/belief-statement';
import { ReminderScheduleId, ReminderScheduleTimestamp } from './reminder-schedule';

export const ReminderAssignmentId = Schema.String.pipe(
  Schema.minLength(1),
  Schema.brand('ReminderAssignmentId'),
);
export type ReminderAssignmentId = typeof ReminderAssignmentId.Type;

const ReminderAssignmentBase = {
  id: ReminderAssignmentId,
  schemaVersion: Schema.Literal(1),
  scheduleId: ReminderScheduleId,
  enabled: Schema.Boolean,
  createdAt: ReminderScheduleTimestamp,
  updatedAt: ReminderScheduleTimestamp,
};

export const PulseReminderAssignmentSchema = Schema.Struct({
  ...ReminderAssignmentBase,
  targetKind: Schema.Literal(REMINDER_TARGET_KINDS.PULSE),
});

export const GuidingBeliefReminderAssignmentSchema = Schema.Struct({
  ...ReminderAssignmentBase,
  targetKind: Schema.Literal(REMINDER_TARGET_KINDS.GUIDING_BELIEF),
  beliefSystemId: BeliefSystemId,
  showFullText: Schema.Boolean,
});

export const ReminderAssignmentSchema = Schema.Union(
  PulseReminderAssignmentSchema,
  GuidingBeliefReminderAssignmentSchema,
);
export type ReminderAssignment = typeof ReminderAssignmentSchema.Type;
export const ReminderAssignmentListSchema = Schema.Array(ReminderAssignmentSchema);

export function createReminderAssignmentId({
  nonce,
  timestamp,
}: {
  nonce: string;
  timestamp: number;
}) {
  return ReminderAssignmentId.make(`assignment-${timestamp}-${nonce}`);
}
