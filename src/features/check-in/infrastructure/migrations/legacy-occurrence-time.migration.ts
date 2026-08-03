import * as Schema from 'effect/Schema';

import {
  CheckInTimestamp,
  withOccurrenceTime,
  type CheckIn,
  type LegacyCheckIn,
} from '../../domain/check-in';

const SurrealNoneSchema = Schema.Struct({ kind: Schema.Literal('none') });

export const LegacyOccurrenceTimeDatabaseSchema = Schema.optional(Schema.Union(
  CheckInTimestamp,
  SurrealNoneSchema,
));

type LegacyOccurrenceTime = CheckInTimestamp | typeof SurrealNoneSchema.Type | undefined;

export function migrateLegacyOccurrenceTime({
  checkIn,
  occurredAt,
}: {
  checkIn: LegacyCheckIn;
  occurredAt: LegacyOccurrenceTime;
}): CheckIn {
  if (typeof occurredAt !== 'string') return withOccurrenceTime(checkIn);
  return withOccurrenceTime({ ...checkIn, occurredAt });
}
