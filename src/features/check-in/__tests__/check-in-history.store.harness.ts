import { describe, expect, test } from 'react-native-harness';

import { EMOTION_IDS } from '@/constants';
import { checkInHistoryStore } from '../application/check-in-history.store';
import { CheckInId, CheckInTimestamp, type CheckIn } from '../domain/check-in';

function entry({ id, occurredAt }: { id: string; occurredAt: string }): CheckIn {
  return {
    id: CheckInId.make(id),
    createdAt: CheckInTimestamp.make('2026-08-03T12:00:00.000Z'),
    occurredAt: CheckInTimestamp.make(occurredAt),
    emotionId: EMOTION_IDS.JOY,
    intensity: 0.5,
    level: 2,
    note: '',
  };
}

describe('check-in history store on the device runtime', () => {
  test('sorts occurrence times without unsupported immutable-array methods', () => {
    const older = entry({
      id: 'older-native-history-entry',
      occurredAt: '2026-08-01T12:00:00.000Z',
    });
    const newer = entry({
      id: 'newer-native-history-entry',
      occurredAt: '2026-08-02T12:00:00.000Z',
    });

    checkInHistoryStore.trigger.hydrated({ entries: [older, newer] });

    expect(checkInHistoryStore.getSnapshot().context.entries).toEqual([newer, older]);
  });
});
