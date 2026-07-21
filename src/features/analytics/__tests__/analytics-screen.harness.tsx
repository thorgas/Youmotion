import { describe, expect, render, test } from 'react-native-harness';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';

import {
  APP_LOCALES,
  BELIEF_SYSTEM_IDS,
  EMOTION_IDS,
} from '@/constants';
import {
  CheckInId,
  CheckInTimestamp,
  type CheckIn,
} from '@/features/check-in/domain/check-in';
import { analyticsObservations } from '../domain/check-in-analytics';
import { AnalyticsContent } from '../ui/analytics-screen';

const FIXED_NOW = new Date(2026, 6, 21, 12);
function checkIn({ day, emotionId, id, note = '' }: {
  day: number;
  emotionId: CheckIn['emotionId'];
  id: string;
  note?: string;
}): CheckIn {
  return {
    id: CheckInId.make(id),
    beliefSystemId: emotionId === EMOTION_IDS.FEAR
      ? BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING
      : undefined,
    createdAt: CheckInTimestamp.make(new Date(2026, 6, day, 12).toISOString()),
    emotionId,
    intensity: 0.5,
    level: 2,
    note,
    guidingStatementSnapshot: emotionId === EMOTION_IDS.FEAR
      ? 'I may pause and still be worthy.'
      : undefined,
  };
}

const entries = [
  checkIn({ day: 2, emotionId: EMOTION_IDS.FEAR, id: 'fear-1' }),
  checkIn({ day: 8, emotionId: EMOTION_IDS.FEAR, id: 'fear-2' }),
  checkIn({ day: 15, emotionId: EMOTION_IDS.FEAR, id: 'fear-3', note: 'A demanding day.' }),
  checkIn({ day: 15, emotionId: EMOTION_IDS.JOY, id: 'joy-1' }),
  checkIn({ day: 19, emotionId: EMOTION_IDS.JOY, id: 'joy-2', note: 'Time with friends.' }),
  checkIn({ day: 21, emotionId: EMOTION_IDS.SADNESS, id: 'sadness-1' }),
] satisfies readonly CheckIn[];

describe('analytics on the device runtime', () => {
  test('renders the populated constellation on the device runtime', async () => {
    expect(analyticsObservations(entries)).toHaveLength(3);
    await render(
      <GestureHandlerRootView style={styles.root}>
        <AnalyticsContent
          entries={entries}
          locale={APP_LOCALES.ENGLISH}
          now={FIXED_NOW}
          statements={[{
            kind: 'built-in',
            beliefSystemId: BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING,
            guidingStatement: 'I may pause and still be worthy.',
          }]}
        />
      </GestureHandlerRootView>,
    );
  });
});

const styles = StyleSheet.create({
  root: { flex: 1 },
});
