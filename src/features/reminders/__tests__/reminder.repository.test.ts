import * as Effect from 'effect/Effect';

import {
  REMINDER_NOTIFICATION_CONTENT,
  REMINDER_TARGET_KINDS,
} from '@/constants';
import { CustomBeliefSystemId } from '@/features/beliefs/domain/belief-statement';
import {
  failNextSurrealUpsert,
  mockSurrealDatabase,
  mockSurrealQuery,
  resetSurrealDatabaseMock,
} from '@/test-utils/surrealdb.repository.mock';
import {
  ReminderAssignmentId,
  ReminderTimestamp,
  type ReminderAssignment,
} from '../domain/reminder-assignment';
import {
  loadReminderData,
  persistReminderAssignment,
} from '../infrastructure/reminder.repository';

jest.mock('@/infrastructure/database/surrealdb.database', () => ({
  getDatabase: jest.fn(() => Promise.resolve(mockSurrealDatabase)),
  queryDatabase: jest.fn(({ surql, variables }: {
    surql: string;
    variables?: Parameters<typeof mockSurrealDatabase.query>[1];
  }) => variables === undefined
    ? mockSurrealDatabase.query(surql)
    : mockSurrealDatabase.query(surql, variables)),
}));

const timestamp = ReminderTimestamp.make('2026-08-18T12:00:00.000Z');
const assignment = {
  id: ReminderAssignmentId.make('assignment-leitsatz'),
  schemaVersion: 2,
  targetKind: REMINDER_TARGET_KINDS.GUIDING_BELIEF,
  beliefSystemId: CustomBeliefSystemId.make('custom-support'),
  enabled: true,
  weekdays: [2, 3, 4, 5, 6],
  times: [{ hour: 9, minute: 0 }],
  notificationContent: REMINDER_NOTIFICATION_CONTENT.GENERAL,
  createdAt: timestamp,
  updatedAt: timestamp,
} satisfies ReminderAssignment;
const pulseAssignment = {
  id: ReminderAssignmentId.make('assignment-pulse'),
  schemaVersion: 2,
  targetKind: REMINDER_TARGET_KINDS.PULSE,
  enabled: true,
  weekdays: [2, 4, 6],
  times: [{ hour: 18, minute: 30 }],
  createdAt: timestamp,
  updatedAt: timestamp,
} satisfies ReminderAssignment;

describe('Effect reminder repository', () => {
  beforeEach(() => resetSurrealDatabaseMock());

  it('persists assignment-owned timing and notification content', async () => {
    await Effect.runPromise(persistReminderAssignment(assignment));

    expect(mockSurrealQuery).toHaveBeenCalledWith(
      'UPSERT $record CONTENT $value',
      expect.objectContaining({
        value: expect.objectContaining({
          assignmentId: assignment.id,
          weekdays: assignment.weekdays,
          times: assignment.times,
          notificationContent: REMINDER_NOTIFICATION_CONTENT.GENERAL,
        }),
      }),
    );
  });

  it('loads the assignment table through the strict v2 schema', async () => {
    mockSurrealQuery.mockResolvedValueOnce([{ statementIndex: 0, value: [{
      ...pulseAssignment,
      schemaVersion: 2n,
      weekdays: pulseAssignment.weekdays.map(BigInt),
      times: pulseAssignment.times.map(({ hour, minute }) => ({
        hour: BigInt(hour),
        minute: BigInt(minute),
      })),
      beliefSystemId: { kind: 'none' },
      notificationContent: { kind: 'none' },
    }] }]);

    await expect(Effect.runPromise(loadReminderData)).resolves.toEqual([pulseAssignment]);
    expect(mockSurrealQuery).toHaveBeenCalledTimes(1);
  });

  it('rejects legacy persisted assignments and tags write failures', async () => {
    mockSurrealQuery.mockResolvedValueOnce([{ statementIndex: 0, value: [{
      ...assignment,
      schemaVersion: 1n,
    }] }]);

    await expect(Effect.runPromise(Effect.flip(loadReminderData))).resolves.toMatchObject({
      _tag: 'ReminderDataError',
      operation: 'decode',
    });

    failNextSurrealUpsert(new Error('storage unavailable'));
    await expect(
      Effect.runPromise(Effect.flip(persistReminderAssignment(assignment))),
    ).resolves.toMatchObject({
      _tag: 'ReminderStorageError',
      operation: 'write',
    });
  });
});
