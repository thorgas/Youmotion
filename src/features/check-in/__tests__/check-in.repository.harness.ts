import * as Effect from 'effect/Effect';
import { afterEach, describe, expect, test } from 'react-native-harness';
import { SurrealRecordId } from 'react-native-surrealdb';

import { CHECK_IN_TABLE, EMOTION_IDS } from '@/constants';
import {
  CheckInId,
  CheckInTimestamp,
  type CheckIn,
  type EmotionSelection,
} from '../domain/check-in';
import { loadCheckIns, persistCheckIn } from '../infrastructure/check-in.repository';
import { getDatabase } from '../infrastructure/surrealdb.database';

const selection = {
  emotionId: EMOTION_IDS.JOY,
  intensity: 0.5,
  level: 2,
  color: '#E7AD32',
} satisfies EmotionSelection;

describe('SurrealDB check-in repository', () => {
  let saved: CheckIn | undefined;
  let legacyId: CheckIn['id'] | undefined;

  afterEach(async () => {
    const database = await getDatabase();
    if (saved) {
      await database.query('DELETE $record', {
        record: new SurrealRecordId(`${CHECK_IN_TABLE}:${saved.id}`),
      });
    }
    if (legacyId) {
      await database.query('DELETE $record', {
        record: new SurrealRecordId(`${CHECK_IN_TABLE}:${legacyId}`),
      });
    }
    saved = undefined;
    legacyId = undefined;
  });

  test('persists and reloads a check-in through the native SurrealKV engine', async () => {
    saved = await Effect.runPromise(persistCheckIn({
      selection,
      note: 'Native SurrealKV harness check',
      occurredAt: CheckInTimestamp.make(new Date().toISOString()),
      beliefSystemId: null,
      existing: null,
    }));

    const loaded = await Effect.runPromise(loadCheckIns);

    expect(loaded).toContainEqual(saved);
  });

  test('loads a native legacy record whose occurrence time is SurrealDB NONE', async () => {
    const database = await getDatabase();
    legacyId = CheckInId.make('legacy-native-occurrence-time');
    const createdAt = CheckInTimestamp.make('2026-07-12T12:00:00.000Z');
    await database.query('UPSERT $record CONTENT $checkIn', {
      record: new SurrealRecordId(`${CHECK_IN_TABLE}:${legacyId}`),
      checkIn: {
        id: legacyId,
        checkInId: legacyId,
        createdAt,
        emotionId: EMOTION_IDS.JOY,
        intensity: 0.5,
        level: 2,
        note: '',
      },
    });

    const loaded = await Effect.runPromise(loadCheckIns);

    expect(loaded).toContainEqual({
      id: legacyId,
      createdAt,
      occurredAt: createdAt,
      emotionId: EMOTION_IDS.JOY,
      intensity: 0.5,
      level: 2,
      note: '',
    });
  });
});
