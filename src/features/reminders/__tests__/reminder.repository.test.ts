import * as Effect from 'effect/Effect';

import { REMINDER_TARGET_KINDS } from '@/constants';
import { CustomBeliefSystemId } from '@/features/check-in/domain/belief-statement';
import {
  failNextSurrealUpsert,
  mockSurrealDatabase,
  mockSurrealQuery,
  resetSurrealDatabaseMock,
} from '@/test-utils/surrealdb.repository.mock';
import {
  ReminderAssignmentId,
  type ReminderAssignment,
} from '../domain/reminder-assignment';
import {
  ReminderScheduleId,
  ReminderScheduleTimestamp,
  type ReminderSchedule,
} from '../domain/reminder-schedule';
import {
  loadReminderData,
  persistReminderAssignment,
  persistReminderSchedule,
} from '../infrastructure/reminder.repository';

jest.mock('@/features/check-in/infrastructure/surrealdb.database', () => ({
  getDatabase: jest.fn(() => Promise.resolve(mockSurrealDatabase)),
  queryDatabase: jest.fn(({ surql, variables }: {
    surql: string;
    variables?: Parameters<typeof mockSurrealDatabase.query>[1];
  }) => variables === undefined
    ? mockSurrealDatabase.query(surql)
    : mockSurrealDatabase.query(surql, variables)),
}));

const timestamp = ReminderScheduleTimestamp.make('2026-08-13T12:00:00.000Z');
const schedule = {
  id: ReminderScheduleId.make('schedule-weekday'),
  schemaVersion: 1,
  name: 'Unter der Woche',
  weekdays: [2, 3, 4, 5, 6],
  times: [{ hour: 9, minute: 0 }],
  createdAt: timestamp,
  updatedAt: timestamp,
} satisfies ReminderSchedule;
const assignment = {
  id: ReminderAssignmentId.make('assignment-leitsatz'),
  schemaVersion: 1,
  scheduleId: schedule.id,
  targetKind: REMINDER_TARGET_KINDS.GUIDING_BELIEF,
  beliefSystemId: CustomBeliefSystemId.make('custom-support'),
  enabled: true,
  showFullText: false,
  createdAt: timestamp,
  updatedAt: timestamp,
} satisfies ReminderAssignment;
const pulseAssignment = {
  id: ReminderAssignmentId.make('assignment-pulse'),
  schemaVersion: 1,
  scheduleId: schedule.id,
  targetKind: REMINDER_TARGET_KINDS.PULSE,
  enabled: true,
  createdAt: timestamp,
  updatedAt: timestamp,
} satisfies ReminderAssignment;

describe('Effect reminder repository', () => {
  beforeEach(() => resetSurrealDatabaseMock());

  it('persists schedules and positive-target assignments independently', async () => {
    await Effect.runPromise(persistReminderSchedule(schedule));
    await Effect.runPromise(persistReminderAssignment(assignment));

    expect(mockSurrealQuery).toHaveBeenCalledWith(
      'UPSERT $record CONTENT $value',
      expect.objectContaining({
        value: expect.objectContaining({ scheduleId: schedule.id }),
      }),
    );
    expect(mockSurrealQuery).toHaveBeenCalledWith(
      'UPSERT $record CONTENT $value',
      expect.objectContaining({
        value: expect.objectContaining({ assignmentId: assignment.id }),
      }),
    );
  });

  it('loads both tables through their current schemas', async () => {
    mockSurrealQuery
      .mockResolvedValueOnce([{ statementIndex: 0, value: [{
        ...schedule,
        schemaVersion: 1n,
        weekdays: schedule.weekdays.map(BigInt),
        times: schedule.times.map(({ hour, minute }) => ({
          hour: BigInt(hour),
          minute: BigInt(minute),
        })),
      }] }])
      .mockResolvedValueOnce([{ statementIndex: 0, value: [{
        ...pulseAssignment,
        schemaVersion: 1n,
        beliefSystemId: { kind: 'none' },
        showFullText: { kind: 'none' },
      }] }]);

    await expect(Effect.runPromise(loadReminderData)).resolves.toEqual({
      schedules: [schedule],
      assignments: [pulseAssignment],
    });
  });

  it('serializes local table reads for the embedded database client', async () => {
    let scheduleReadCompleted = false;
    mockSurrealQuery
      .mockImplementationOnce(async () => {
        await Promise.resolve();
        scheduleReadCompleted = true;
        return [{ statementIndex: 0, value: [schedule] }];
      })
      .mockImplementationOnce(async () => {
        expect(scheduleReadCompleted).toBe(true);
        return [{ statementIndex: 0, value: [assignment] }];
      });

    await expect(Effect.runPromise(loadReminderData)).resolves.toEqual({
      schedules: [schedule],
      assignments: [assignment],
    });
  });

  it('rejects malformed persisted assignments and tags write failures', async () => {
    mockSurrealQuery
      .mockResolvedValueOnce([{ statementIndex: 0, value: [schedule] }])
      .mockResolvedValueOnce([{ statementIndex: 0, value: [{ ...assignment, beliefSystemId: null }] }]);

    await expect(Effect.runPromise(Effect.flip(loadReminderData))).resolves.toMatchObject({
      _tag: 'ReminderDataError',
      operation: 'decode',
    });

    failNextSurrealUpsert(new Error('storage unavailable'));
    await expect(
      Effect.runPromise(Effect.flip(persistReminderSchedule(schedule))),
    ).resolves.toMatchObject({
      _tag: 'ReminderStorageError',
      operation: 'write',
    });
  });
});
