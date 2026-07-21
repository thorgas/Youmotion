import { screen } from '@react-native-harness/ui';
import { describe, expect, render, test } from 'react-native-harness';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Platform, StyleSheet, View } from 'react-native';

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
import { emotions } from '@/features/check-in/domain/emotion';
import type { EmotionFrequency } from '../domain/check-in-analytics';
import { AnalyticsContent } from '../ui/analytics-screen';
import { EmotionRadarChart } from '../ui/emotion-radar-chart';

const FIXED_NOW = new Date(2026, 6, 21, 12);
const LABELS = ['Joy', 'Love', 'Shame', 'Disgust', 'Sadness', 'Anger', 'Fear'];
const COLORS = emotions.map(({ color }) => color);
const visualTest = Platform.OS === 'android' ? test : test.skip;

function frequencies(counts: readonly number[]) {
  return emotions.map(({ id }, index) => ({
    emotionId: id,
    count: counts[index] ?? 0,
  })) satisfies readonly EmotionFrequency[];
}

async function expectImageSnapshot({
  name,
  testID,
}: {
  name: string;
  testID: string;
}) {
  const screenshot = await screen.screenshot(await screen.findByTestId(testID));
  if (!screenshot) throw new Error(`The ${name} screenshot is required.`);
  await expect(screenshot).toMatchImageSnapshot({
    name,
    comparisonMethod: 'ssim',
    ssimThreshold: 0.98,
  });
}

async function renderRadar(counts: readonly number[]) {
  await render(
    <View
      collapsable={false}
      style={styles.radarFixture}
      testID="analytics-radar-visual-fixture"
    >
      <EmotionRadarChart
        colors={COLORS}
        frequencies={frequencies(counts)}
        labels={LABELS}
        width={360}
      />
    </View>,
  );
}

function checkIn({
  beliefSystemId,
  day,
  emotionId,
  guidingStatementSnapshot,
  id,
}: {
  beliefSystemId?: CheckIn['beliefSystemId'];
  day: number;
  emotionId: CheckIn['emotionId'];
  guidingStatementSnapshot?: string;
  id: string;
}): CheckIn {
  const statementSnapshot = guidingStatementSnapshot
    ?? (beliefSystemId ? 'I may pause and still be worthy.' : undefined);
  return {
    id: CheckInId.make(id),
    beliefSystemId,
    createdAt: CheckInTimestamp.make(new Date(2026, 6, day, 12).toISOString()),
    emotionId,
    intensity: 0.5,
    level: 2,
    note: '',
    ...(statementSnapshot ? { guidingStatementSnapshot: statementSnapshot } : {}),
  };
}

const fullAnalyticsEntries = [
  checkIn({ day: 13, emotionId: EMOTION_IDS.JOY, id: 'joy-1' }),
  checkIn({ day: 14, emotionId: EMOTION_IDS.LOVE, id: 'love-1' }),
  checkIn({ day: 15, emotionId: EMOTION_IDS.SHAME, id: 'shame-1' }),
  checkIn({ day: 16, emotionId: EMOTION_IDS.DISGUST, id: 'disgust-1' }),
  checkIn({ day: 17, emotionId: EMOTION_IDS.SADNESS, id: 'sadness-1' }),
  checkIn({ day: 18, emotionId: EMOTION_IDS.ANGER, id: 'anger-1' }),
  checkIn({
    beliefSystemId: BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING,
    day: 19,
    emotionId: EMOTION_IDS.FEAR,
    id: 'fear-1',
  }),
  checkIn({
    beliefSystemId: BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING,
    day: 19,
    emotionId: EMOTION_IDS.FEAR,
    id: 'fear-2',
  }),
  checkIn({ day: 19, emotionId: EMOTION_IDS.JOY, id: 'joy-2' }),
  checkIn({ day: 19, emotionId: EMOTION_IDS.JOY, id: 'joy-3' }),
  checkIn({ day: 19, emotionId: EMOTION_IDS.LOVE, id: 'love-2' }),
  checkIn({ day: 19, emotionId: EMOTION_IDS.SHAME, id: 'shame-2' }),
  checkIn({ day: 19, emotionId: EMOTION_IDS.DISGUST, id: 'disgust-2' }),
  checkIn({ day: 19, emotionId: EMOTION_IDS.SADNESS, id: 'sadness-2' }),
  checkIn({ day: 19, emotionId: EMOTION_IDS.ANGER, id: 'anger-2' }),
] satisfies readonly CheckIn[];

const tiedLeitsatzEntries = [
  checkIn({
    beliefSystemId: BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING,
    day: 18,
    emotionId: EMOTION_IDS.SADNESS,
    id: 'tie-pause-1',
  }),
  checkIn({
    beliefSystemId: BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING,
    day: 19,
    emotionId: EMOTION_IDS.FEAR,
    id: 'tie-pause-2',
  }),
  checkIn({
    beliefSystemId: BELIEF_SYSTEM_IDS.LOVE_REQUIRES_HELPING,
    day: 18,
    emotionId: EMOTION_IDS.SHAME,
    guidingStatementSnapshot: 'I may prioritize myself too.',
    id: 'tie-prioritize-1',
  }),
  checkIn({
    beliefSystemId: BELIEF_SYSTEM_IDS.LOVE_REQUIRES_HELPING,
    day: 19,
    emotionId: EMOTION_IDS.ANGER,
    guidingStatementSnapshot: 'I may prioritize myself too.',
    id: 'tie-prioritize-2',
  }),
] satisfies readonly CheckIn[];

describe('analytics chart visual regression', () => {
  visualTest('keeps the zero-data chart labels and neutral geometry stable', async () => {
    await renderRadar([0, 0, 0, 0, 0, 0, 0]);
    await expectImageSnapshot({
      name: 'analytics-radar-zero-data',
      testID: 'analytics-radar-visual-fixture',
    });
  });

  visualTest('keeps a single-axis spike stable', async () => {
    await renderRadar([0, 0, 0, 0, 0, 0, 12]);
    await expectImageSnapshot({
      name: 'analytics-radar-single-axis-spike',
      testID: 'analytics-radar-visual-fixture',
    });
  });

  visualTest('keeps a balanced full chart stable', async () => {
    await renderRadar([8, 8, 8, 8, 8, 8, 8]);
    await expectImageSnapshot({
      name: 'analytics-radar-balanced-full-chart',
      testID: 'analytics-radar-visual-fixture',
    });
  });

  visualTest('keeps tied top Leitsätze visible together', async () => {
    await render(
      <GestureHandlerRootView style={styles.root}>
        <AnalyticsContent
          entries={tiedLeitsatzEntries}
          locale={APP_LOCALES.ENGLISH}
          now={FIXED_NOW}
          statements={[]}
        />
      </GestureHandlerRootView>,
    );

    await expectImageSnapshot({
      name: 'analytics-tied-top-leitsaetze',
      testID: 'analytics-last-week-leitsatz',
    });
  });

  visualTest('keeps the dense chart, legend, and calendar stable together', async () => {
    await render(
      <GestureHandlerRootView style={styles.root}>
        <AnalyticsContent
          entries={fullAnalyticsEntries}
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

    await expectImageSnapshot({
      name: 'analytics-dense-constellation-with-legend',
      testID: 'analytics-constellation',
    });
    await expectImageSnapshot({
      name: 'analytics-dense-week-calendar',
      testID: 'analytics-calendar',
    });
  });
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  radarFixture: {
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    height: 316,
    justifyContent: 'center',
    width: 360,
  },
});
