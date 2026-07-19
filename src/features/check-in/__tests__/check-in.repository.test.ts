import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Effect from 'effect/Effect';
import { NONE } from 'react-native-surrealdb';

import { CHECK_IN_STORAGE_KEY, EMOTION_IDS, BELIEF_SYSTEM_IDS } from '@/constants';
import { CheckInId } from '../domain/check-in';
import type { EmotionSelection } from '../domain/check-in';
import {
  deleteCheckIn,
  loadCheckIns,
  persistCheckIn,
} from '../infrastructure/check-in.repository';
import {
  failNextSurrealDelete,
  failNextSurrealUpsert,
  mockSurrealDatabase,
  mockSurrealQuery,
  resetSurrealDatabaseMock,
} from '@/test-utils/surrealdb.repository.mock';

jest.mock('../infrastructure/surrealdb.database', () => ({
  getDatabase: jest.fn(() => Promise.resolve(mockSurrealDatabase)),
}));

const selection = {
  emotionId: EMOTION_IDS.JOY,
  intensity: 0.5,
  level: 2,
  color: '#E7AD32',
} satisfies EmotionSelection;

describe('Effect check-in repository', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    resetSurrealDatabaseMock();
  });

  it('persists a schema-validated check-in', async () => {
    const saved = await Effect.runPromise(persistCheckIn({
      selection,
      note: '  Ein heller Moment.  ',
      beliefSystemId: BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING,
      existing: null,
    }));

    expect(saved.note).toBe('Ein heller Moment.');
    expect(mockSurrealQuery).toHaveBeenCalledWith(
      'UPSERT $record CONTENT $checkIn',
      expect.objectContaining({
        checkIn: expect.objectContaining({
          checkInId: saved.id,
          note: 'Ein heller Moment.',
          beliefSystemId: BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING,
        }),
      }),
    );
  });

  it('updates an existing check-in without changing its identity or timestamp', async () => {
    const saved = await Effect.runPromise(persistCheckIn({
      selection,
      note: 'Before',
      beliefSystemId: null,
      existing: null,
    }));
    const updated = await Effect.runPromise(persistCheckIn({
      selection: { ...selection, intensity: 0.8, level: 4 },
      note: 'After',
      beliefSystemId: BELIEF_SYSTEM_IDS.PERFECT_EVERYTHING,
      existing: saved,
    }));

    expect(updated).toMatchObject({
      id: saved.id,
      createdAt: saved.createdAt,
      intensity: 0.8,
      level: 4,
      note: 'After',
      beliefSystemId: BELIEF_SYSTEM_IDS.PERFECT_EVERYTHING,
    });
  });

  it('loads schema-validated check-ins from SurrealDB', async () => {
    const stored = {
      id: 'stored-check-in',
      createdAt: '2026-07-12T12:00:00.000Z',
      emotionId: EMOTION_IDS.JOY,
      intensity: 0.5,
      level: 2n,
      note: '',
      beliefSystemId: NONE,
    };
    mockSurrealQuery.mockResolvedValueOnce([{ statementIndex: 0, value: [stored] }]);

    const loaded = await Effect.runPromise(loadCheckIns);
    expect(loaded).toEqual([{
      id: stored.id,
      createdAt: stored.createdAt,
      emotionId: stored.emotionId,
      intensity: stored.intensity,
      level: 2,
      note: stored.note,
    }]);
  });

  it('migrates legacy AsyncStorage check-ins without localized labels', async () => {
    await AsyncStorage.setItem(CHECK_IN_STORAGE_KEY, JSON.stringify([{
      id: 'legacy-check-in',
      createdAt: '2026-07-12T12:00:00.000Z',
      emotionId: EMOTION_IDS.JOY,
      emotion: 'Freude',
      nuance: 'Fröhlichkeit',
      intensity: 0.5,
      note: '',
    }]));

    const loaded = await Effect.runPromise(loadCheckIns);

    expect(loaded).toEqual([expect.objectContaining({ id: 'legacy-check-in' })]);
    expect(mockSurrealQuery).toHaveBeenCalledWith(
      'UPSERT $record CONTENT $checkIn',
      expect.objectContaining({
        checkIn: expect.objectContaining({ checkInId: 'legacy-check-in' }),
      }),
    );
    await expect(AsyncStorage.getItem(CHECK_IN_STORAGE_KEY)).resolves.toBeNull();
  });

  it('surfaces invalid database results as a tagged data error', async () => {
    mockSurrealQuery.mockResolvedValueOnce([{ statementIndex: 0, value: [{ invalid: true }] }]);
    const error = await Effect.runPromise(Effect.flip(loadCheckIns));
    expect(error).toMatchObject({ _tag: 'CheckInDataError' });
  });

  it('surfaces native storage failures as tagged errors', async () => {
    failNextSurrealUpsert(new Error('storage unavailable'));
    const error = await Effect.runPromise(Effect.flip(persistCheckIn({
      selection,
      note: '',
      beliefSystemId: null,
      existing: null,
    })));
    expect(error).toMatchObject({
      _tag: 'CheckInStorageError',
      operation: 'write',
    });
  });

  it('deletes a check-in by its SurrealDB record ID', async () => {
    const id = CheckInId.make('delete-me');

    await Effect.runPromise(deleteCheckIn(id));

    expect(mockSurrealQuery).toHaveBeenCalledWith(
      'DELETE $record',
      expect.objectContaining({
        record: expect.objectContaining({
          kind: 'record',
          value: expect.stringContaining('delete-me'),
        }),
      }),
    );
  });

  it('surfaces delete failures as tagged storage errors', async () => {
    failNextSurrealDelete(new Error('delete unavailable'));

    const error = await Effect.runPromise(Effect.flip(deleteCheckIn(CheckInId.make('delete-me'))));

    expect(error).toMatchObject({
      _tag: 'CheckInStorageError',
      operation: 'delete',
    });
  });
});
