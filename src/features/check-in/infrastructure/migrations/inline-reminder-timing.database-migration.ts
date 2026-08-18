import { REMINDER_ASSIGNMENT_TABLE, REMINDER_SCHEDULE_TABLE } from '@/constants';
import {
  DatabaseMigrationId,
  type DatabaseMigration,
} from './database-migration';

export const inlineReminderTimingDatabaseMigration = {
  id: DatabaseMigrationId.make('0003-inline-reminder-timing'),
  description: 'Move each reminder schedule into its owning reminder assignment.',
  statement: `LET $legacyScheduleIds = (
  SELECT VALUE scheduleId
  FROM ${REMINDER_ASSIGNMENT_TABLE}
  WHERE schemaVersion = 1
);

LET $legacyAssignments = (
  SELECT *
  FROM ${REMINDER_ASSIGNMENT_TABLE}
  WHERE schemaVersion = 1
);

FOR $assignment IN $legacyAssignments {
  LET $schedule = (
    SELECT *
    FROM ${REMINDER_SCHEDULE_TABLE}
    WHERE scheduleId = $assignment.scheduleId
  )[0];

  IF $schedule = NONE {
    THROW 'Cannot migrate reminder assignment without its reminder schedule';
  };

  UPDATE $assignment.id SET
    schemaVersion = 2,
    weekdays = $schedule.weekdays,
    times = $schedule.times;

  IF $assignment.targetKind = 'guidingBelief' {
    UPDATE $assignment.id SET
      notificationContent = IF $assignment.showFullText = true
        THEN 'leitsatz'
        ELSE 'general'
      END;
  };

  UPDATE $assignment.id UNSET scheduleId, showFullText;
};

FOR $scheduleId IN $legacyScheduleIds {
  DELETE type::record('${REMINDER_SCHEDULE_TABLE}', $scheduleId);
};`,
} satisfies DatabaseMigration;
