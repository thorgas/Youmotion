import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Effect from 'effect/Effect';

import { CHECK_IN_STORAGE_KEY, EMOTION_IDS } from '@/constants';
import type { EmotionSelection } from '../domain/check-in';
import { loadCheckIns, persistCheckIn } from '../infrastructure/check-in.repository';

const selection = {
  emotionId: EMOTION_IDS.JOY,
  emotion: 'Freude',
  nuance: 'Fröhlichkeit',
  intensity: 0.5,
  level: 2,
  color: '#E7AD32',
} satisfies EmotionSelection;

describe('Effect check-in repository', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.restoreAllMocks();
  });

  it('round-trips schema-validated check-ins', async () => {
    const saved = await Effect.runPromise(persistCheckIn({ selection, note: '  Ein heller Moment.  ' }));
    const loaded = await Effect.runPromise(loadCheckIns);

    expect(saved.note).toBe('Ein heller Moment.');
    expect(loaded).toEqual([saved]);
  });

  it('surfaces invalid persisted JSON as a tagged data error', async () => {
    await AsyncStorage.setItem(CHECK_IN_STORAGE_KEY, '{invalid');
    const error = await Effect.runPromise(Effect.flip(loadCheckIns));
    expect(error).toMatchObject({ _tag: 'CheckInDataError' });
  });

  it('surfaces native storage failures as tagged errors', async () => {
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('storage unavailable'));
    const error = await Effect.runPromise(Effect.flip(persistCheckIn({ selection, note: '' })));
    expect(error).toMatchObject({
      _tag: 'CheckInStorageError',
      operation: 'write',
    });
  });
});
