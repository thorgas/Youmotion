import { NONE } from 'react-native-surrealdb';

import { EMOTION_IDS } from '@/constants';
import { CheckInId, CheckInTimestamp, type LegacyCheckIn } from '../domain/check-in';
import { migrateLegacyOccurrenceTime } from '../infrastructure/migrations/legacy-occurrence-time.migration';

const legacyCheckIn = {
  id: CheckInId.make('legacy-occurrence-time'),
  createdAt: CheckInTimestamp.make('2026-07-12T12:00:00.000Z'),
  emotionId: EMOTION_IDS.JOY,
  intensity: 0.5,
  level: 2,
  note: '',
} satisfies LegacyCheckIn;

describe('legacy occurrence-time migration', () => {
  it.each([undefined, NONE])(
    'uses the creation time when the database occurrence time is %p',
    (occurredAt) => {
      expect(migrateLegacyOccurrenceTime({ checkIn: legacyCheckIn, occurredAt })).toEqual({
        ...legacyCheckIn,
        occurredAt: legacyCheckIn.createdAt,
      });
    },
  );

  it('preserves an occurrence time that was already migrated', () => {
    const occurredAt = CheckInTimestamp.make('2026-07-11T09:30:00.000Z');

    expect(migrateLegacyOccurrenceTime({ checkIn: legacyCheckIn, occurredAt })).toEqual({
      ...legacyCheckIn,
      occurredAt,
    });
  });
});
