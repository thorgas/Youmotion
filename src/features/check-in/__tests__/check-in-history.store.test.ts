import { EMOTION_IDS } from '@/constants';
import { checkInHistoryStore } from '../application/check-in-history.store';
import {
  CheckInId,
  CheckInTimestamp,
  type CheckIn,
} from '../domain/check-in';

function entry(index: number): CheckIn {
  return {
    id: CheckInId.make(`all-history-${index}`),
    createdAt: CheckInTimestamp.make(new Date(2026, 0, index + 1).toISOString()),
    emotionId: EMOTION_IDS.JOY,
    intensity: 0.5,
    level: 2,
    note: '',
  };
}

describe('check-in history store', () => {
  beforeEach(() => {
    checkInHistoryStore.trigger.hydrated({ entries: [] });
  });

  it('keeps every recorded moment in memory', () => {
    Array.from({ length: 35 }, (_, index) => entry(index)).forEach((checkIn) => {
      checkInHistoryStore.trigger.recorded({ entry: checkIn });
    });

    expect(checkInHistoryStore.getSnapshot().context.entries).toHaveLength(35);
  });
});
