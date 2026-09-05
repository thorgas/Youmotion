import { screen, userEvent } from '@react-native-harness/ui';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  render,
  resetModules,
  test,
} from 'react-native-harness';
import * as Effect from 'effect/Effect';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import type { ComponentProps } from 'react';

import {
  ANALYTICS_EVENTS,
  ANALYTICS_TIMEFRAMES,
  APP_LOCALES,
  BELIEF_SYSTEM_IDS,
  EMOTION_IDS,
} from '@/constants';
import {
  CheckInId,
  CheckInTimestamp,
  type CheckIn,
} from '@/features/check-in/domain/check-in';
import { analyticsStore } from '@/app-stores';

type AnalyticsContentComponent = typeof import('../ui/analytics-screen')['AnalyticsContent'];
let AnalyticsContent: AnalyticsContentComponent;

const FIXED_NOW = new Date(2026, 6, 21, 12);
let capturedEvidenceCount = 0;
let capturedEvidenceKind = '';
const _captureEvidence: NonNullable<
  ComponentProps<AnalyticsContentComponent>['onEvidencePress']
> = (selection) => {
  capturedEvidenceCount = selection.insight.supportingIds.length;
  capturedEvidenceKind = selection.insight.kind;
};
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
    occurredAt: CheckInTimestamp.make(new Date(2026, 6, day, 12).toISOString()),
    emotionId,
    intensity: 0.5,
    level: 2,
    note,
    guidingStatementSnapshot: emotionId === EMOTION_IDS.FEAR
      ? 'I may pause and still be worthy.'
      : undefined,
  };
}

function checkInsForBelief({
  beliefSystemId,
  count,
  day,
  emotionId,
  guidingStatementSnapshot,
  month = 6,
  prefix,
}: {
  beliefSystemId: CheckIn['beliefSystemId'];
  count: number;
  day: number;
  emotionId: CheckIn['emotionId'];
  guidingStatementSnapshot: string;
  month?: number;
  prefix: string;
}): readonly CheckIn[] {
  return Array.from({ length: count }, (_, index) => ({
    id: CheckInId.make(`${prefix}-${String(index + 1)}`),
    beliefSystemId,
    createdAt: CheckInTimestamp.make(
      new Date(2026, month, day, 10, index).toISOString(),
    ),
    occurredAt: CheckInTimestamp.make(
      new Date(2026, month, day, 10, index).toISOString(),
    ),
    emotionId,
    guidingStatementSnapshot,
    intensity: 0.5,
    level: 2,
    note: `Moment ${String(index + 1)}`,
  }));
}

const tiedScreenshotShape = [
  ...checkInsForBelief({
    beliefSystemId: BELIEF_SYSTEM_IDS.LOVE_REQUIRES_HELPING,
    count: 7,
    day: 18,
    emotionId: EMOTION_IDS.ANGER,
    guidingStatementSnapshot: 'I may prioritize myself too.',
    prefix: 'previous-saturday-prioritize',
  }),
  ...checkInsForBelief({
    beliefSystemId: BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING,
    count: 7,
    day: 19,
    emotionId: EMOTION_IDS.SADNESS,
    guidingStatementSnapshot: 'I may pause and still be worthy.',
    prefix: 'previous-sunday-pause',
  }),
] satisfies readonly CheckIn[];

const competingInsightEntries = [
  ...checkInsForBelief({
    beliefSystemId: BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING,
    count: 11,
    day: 18,
    emotionId: EMOTION_IDS.FEAR,
    guidingStatementSnapshot: 'Ich darf auch mal nicht funktionieren und werde trotzdem geliebt.',
    prefix: 'dominant-guiding-belief',
  }),
  ...checkInsForBelief({
    beliefSystemId: BELIEF_SYSTEM_IDS.NO_MISTAKES,
    count: 4,
    day: 19,
    emotionId: EMOTION_IDS.SHAME,
    guidingStatementSnapshot: 'Mistakes help me learn.',
    prefix: 'competing-belief-pattern',
  }),
  checkIn({ day: 17, emotionId: EMOTION_IDS.JOY, id: 'competing-joy' }),
] satisfies readonly CheckIn[];

beforeEach(() => {
  mock('@/features/analytics/ui/analytics-timeframe-selector', () => ({
    AnalyticsTimeframeSelector: () => null,
  }));
  mock('@/features/data-safety/infrastructure/data-archive.repository', () => ({
    deleteAllJournalData: () => Effect.succeed(undefined),
    exportDataArchive: () => Effect.succeed(undefined),
    pickDataArchive: () => Effect.succeed(null),
    restoreDataArchive: () => Effect.succeed(undefined),
  }));
  const analyticsModule: typeof import('../ui/analytics-screen') = require(
    '../ui/analytics-screen',
  );
  AnalyticsContent = analyticsModule.AnalyticsContent;
});

afterEach(() => {
  capturedEvidenceCount = 0;
  capturedEvidenceKind = '';
  analyticsStore.trigger[ANALYTICS_EVENTS.TIMEFRAME_SELECTED]({
    timeframe: ANALYTICS_TIMEFRAMES.LAST_WEEK,
  });
  resetModules();
});

describe('analytics on the device runtime', () => {
  test('shows one hero with named tabs when Leitsatz and pattern analytics coexist', async () => {
    const settingsModule: typeof import('@/app-stores') = require('@/app-stores');
    const localeModule: typeof import('@/localization/app-locale-provider') = require(
      '@/localization/app-locale-provider',
    );
    settingsModule.appSettingsStore.trigger.languageChanged({ locale: APP_LOCALES.GERMAN });
    const { AppLocaleProvider } = localeModule;
    await render(
      <AppLocaleProvider>
      <GestureHandlerRootView style={styles.root}>
        <AnalyticsContent
          entries={competingInsightEntries}
          locale={APP_LOCALES.GERMAN}
          now={FIXED_NOW}
          onEvidencePress={_captureEvidence}
          statements={[]}
        />
      </GestureHandlerRootView>
      </AppLocaleProvider>,
    );

    expect(await screen.findByTestId('analytics-insight-tabs')).not.toBeNull();
    expect(await screen.findByTestId(
      `analytics-insight-guiding-belief-${BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING}`,
    )).not.toBeNull();
    expect(screen.queryByTestId('analytics-insight-pattern-belief')).toBeNull();
    const guidingBeliefScreenshot = await screen.screenshot(
      await screen.findByTestId('analytics-primary-insight'),
    );
    if (!guidingBeliefScreenshot) throw new Error('The guiding-belief hero screenshot is required.');
    await expect(guidingBeliefScreenshot).toMatchImageSnapshot({
      name: 'analytics-competing-insights-guiding-belief',
      comparisonMethod: 'ssim',
      ssimThreshold: 0.98,
    });
    await userEvent.press(await screen.findByTestId('analytics-insight-evidence'));
    expect(capturedEvidenceCount).toBe(11);
    expect(capturedEvidenceKind).toBe('guiding-belief');
    await userEvent.press(await screen.findByTestId('analytics-insight-tab-pattern'));
    expect(await screen.findByTestId('analytics-insight-pattern-belief')).not.toBeNull();
    expect(await screen.findByTestId('analytics-insight-next-pattern')).not.toBeNull();
    expect(screen.queryByTestId(
      `analytics-insight-guiding-belief-${BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING}`,
    )).toBeNull();
    const patternScreenshot = await screen.screenshot(
      await screen.findByTestId('analytics-primary-insight'),
    );
    if (!patternScreenshot) throw new Error('The pattern hero screenshot is required.');
    await expect(patternScreenshot).toMatchImageSnapshot({
      name: 'analytics-competing-insights-pattern',
      comparisonMethod: 'ssim',
      ssimThreshold: 0.98,
    });
    await userEvent.press(await screen.findByTestId('analytics-insight-evidence'));
    expect(capturedEvidenceCount).toBe(11);
    expect(capturedEvidenceKind).toBe('belief');
    expect(screen.queryByTestId('analytics-insight-dismiss')).toBeNull();

    await userEvent.press(await screen.findByTestId('analytics-insight-next-pattern'));
    expect(await screen.findByTestId('analytics-insight-pattern-emotion')).not.toBeNull();
    expect(screen.queryByTestId('analytics-insight-pattern-belief')).toBeNull();
    const nextPatternScreenshot = await screen.screenshot(
      await screen.findByTestId('analytics-primary-insight'),
    );
    if (!nextPatternScreenshot) throw new Error('The additional pattern screenshot is required.');
    await expect(nextPatternScreenshot).toMatchImageSnapshot({
      name: 'analytics-competing-insights-next-pattern',
      comparisonMethod: 'ssim',
      ssimThreshold: 0.98,
    });
    await userEvent.press(await screen.findByTestId('analytics-insight-evidence'));
    expect(capturedEvidenceCount).toBe(11);
    expect(capturedEvidenceKind).toBe('emotion');

    await userEvent.press(await screen.findByTestId('analytics-insight-next-pattern'));
    expect(await screen.findByTestId('analytics-insight-pattern-belief')).not.toBeNull();
  });

  test('does not show pattern navigation when only one pattern is available', async () => {
    const entries = [
      checkIn({ day: 17, emotionId: EMOTION_IDS.JOY, id: 'joy-1' }),
      checkIn({ day: 18, emotionId: EMOTION_IDS.JOY, id: 'joy-2' }),
      checkIn({ day: 19, emotionId: EMOTION_IDS.JOY, id: 'joy-3' }),
    ];
    await render(
      <GestureHandlerRootView style={styles.root}>
        <AnalyticsContent
          entries={entries}
          locale={APP_LOCALES.ENGLISH}
          now={FIXED_NOW}
          statements={[]}
        />
      </GestureHandlerRootView>,
    );

    expect(await screen.findByTestId('analytics-insight-pattern-emotion')).not.toBeNull();
    expect(screen.queryByTestId('analytics-insight-next-pattern')).toBeNull();
  });

  test('keeps tied guiding beliefs inside one hero', async () => {
    expect(tiedScreenshotShape).toHaveLength(14);
    await render(
      <GestureHandlerRootView style={styles.root}>
        <AnalyticsContent
          entries={tiedScreenshotShape}
          locale={APP_LOCALES.ENGLISH}
          now={FIXED_NOW}
          statements={[]}
        />
      </GestureHandlerRootView>,
    );

    expect(await screen.findByTestId('analytics-primary-insight')).not.toBeNull();
    expect(await screen.findByTestId(
      `analytics-insight-guiding-belief-${BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING}`,
    )).not.toBeNull();
    expect(screen.queryByTestId('analytics-top-leitsatz')).toBeNull();
  });

});

const styles = StyleSheet.create({
  root: { flex: 1 },
});
