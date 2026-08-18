import * as Schema from 'effect/Schema';

import {
  REMINDER_NOTIFICATION_CONTENT,
  REMINDER_TARGET_KINDS,
} from '@/constants';
import { BeliefSystemId } from '@/features/check-in/domain/belief-statement';
import { ReminderTimingSchema } from './reminder-timing';

export const ReminderAssignmentId = Schema.String.pipe(
  Schema.minLength(1),
  Schema.brand('ReminderAssignmentId'),
);
export type ReminderAssignmentId = typeof ReminderAssignmentId.Type;

export const ReminderTimestamp = Schema.String.pipe(
  Schema.minLength(1),
  Schema.brand('ReminderTimestamp'),
);
export type ReminderTimestamp = typeof ReminderTimestamp.Type;

const ReminderAssignmentBase = {
  id: ReminderAssignmentId,
  schemaVersion: Schema.Literal(2),
  ...ReminderTimingSchema.fields,
  enabled: Schema.Boolean,
  createdAt: ReminderTimestamp,
  updatedAt: ReminderTimestamp,
};

export const ReminderNotificationContent = Schema.Literal(
  ...Object.values(REMINDER_NOTIFICATION_CONTENT),
);
export type ReminderNotificationContent = typeof ReminderNotificationContent.Type;

export const PulseReminderAssignmentSchema = Schema.Struct({
  ...ReminderAssignmentBase,
  targetKind: Schema.Literal(REMINDER_TARGET_KINDS.PULSE),
});
export type PulseReminderAssignment = typeof PulseReminderAssignmentSchema.Type;

export const GuidingBeliefReminderAssignmentSchema = Schema.Struct({
  ...ReminderAssignmentBase,
  targetKind: Schema.Literal(REMINDER_TARGET_KINDS.GUIDING_BELIEF),
  beliefSystemId: BeliefSystemId,
  notificationContent: ReminderNotificationContent,
});
export type GuidingBeliefReminderAssignment =
  typeof GuidingBeliefReminderAssignmentSchema.Type;

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
