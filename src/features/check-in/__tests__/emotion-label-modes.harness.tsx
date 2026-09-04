import {
  describe,
  expect,
  render,
  test,
} from 'react-native-harness';
import { screen } from '@react-native-harness/ui';
import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  EMOTION_IDS,
  EMOTION_LABEL_MODES,
} from '@/constants';
import type { EmotionLabelMode } from '@/preferences/emotion-label-mode';
import { AppLocaleProvider } from '@/localization/app-locale-provider';
import { actionColors } from '@/theme';
import { emotions, type Emotion } from '../domain/emotion';
import { EmotionAxisLabel } from '../ui/emotion-axis-label';

const emotion = {
  id: EMOTION_IDS.JOY,
  color: '#E7AD32',
  wash: '#F5D88E',
  nuanceCount: 7,
} satisfies Emotion;

async function renderEmotionLabel(mode: EmotionLabelMode) {
  return render(emotionLabel({ isActive: false, mode }));
}

function emotionLabel({
  isActive,
  mode,
}: {
  isActive: boolean;
  mode: EmotionLabelMode;
}) {
  return (
    <AppLocaleProvider>
      <View style={styles.singleLabel}>
        <EmotionAxisLabel
          emotion={emotion}
          isActive={isActive}
          labelMode={mode}
          x={120}
          y={40}
        />
      </View>
    </AppLocaleProvider>
  );
}

async function expectLabelNodes({
  emoji,
  word,
}: {
  emoji: boolean;
  word: boolean;
}) {
  if (emoji) {
    await screen.findByTestId('base-emotion-emoji-freude');
  } else {
    expect(screen.queryByTestId('base-emotion-emoji-freude')).toBeNull();
  }
  if (word) {
    await screen.findByTestId('base-emotion-label-freude');
  } else {
    expect(screen.queryByTestId('base-emotion-label-freude')).toBeNull();
  }
}

function emotionLabelRing(activeEmotionId: Emotion['id'] | null) {
  return (
    <AppLocaleProvider>
      <View
        collapsable={false}
        style={styles.labelRing}
        testID="emotion-label-ring"
      >
        {emotions.map((candidate, index) => (
          <EmotionAxisLabel
            emotion={candidate}
            isActive={candidate.id === activeEmotionId}
            key={candidate.id}
            labelMode={EMOTION_LABEL_MODES.EMOJI}
            x={35 + index * 45}
            y={60}
          />
        ))}
      </View>
    </AppLocaleProvider>
  );
}

async function expectOnlyActiveWord({
  activeEmotionId,
  rerender,
}: {
  activeEmotionId: Emotion['id'];
  rerender: (element: ReactElement) => Promise<void>;
}) {
  await rerender(emotionLabelRing(activeEmotionId));
  await screen.findByTestId(`base-emotion-label-${activeEmotionId}`);
  const emojiIds = emotions
    .filter((candidate) => (
      screen.queryByTestId(`base-emotion-emoji-${candidate.id}`) !== null
    ))
    .map((candidate) => candidate.id);
  const wordIds = emotions
    .filter((candidate) => (
      screen.queryByTestId(`base-emotion-label-${candidate.id}`) !== null
    ))
    .map((candidate) => candidate.id);
  const expectedEmojiIds = emotions
    .filter((candidate) => candidate.id !== activeEmotionId)
    .map((candidate) => candidate.id);

  expect(emojiIds).toEqual(expectedEmojiIds);
  expect(wordIds).toEqual([activeEmotionId]);
}

describe('emotion label modes on the device runtime', () => {
  test('mounts only emoji nodes in emoji mode', async () => {
    await renderEmotionLabel(EMOTION_LABEL_MODES.EMOJI);

    await screen.findByTestId('base-emotion-emoji-freude');
    expect(screen.queryByTestId('base-emotion-label-freude')).toBeNull();
  });

  test('mounts only text nodes in text mode', async () => {
    await renderEmotionLabel(EMOTION_LABEL_MODES.TEXT);

    expect(screen.queryByTestId('base-emotion-emoji-freude')).toBeNull();
    await screen.findByTestId('base-emotion-label-freude');
  });

  test('mounts both node types in combined mode', async () => {
    await renderEmotionLabel(EMOTION_LABEL_MODES.BOTH);

    await screen.findByTestId('base-emotion-emoji-freude');
    await screen.findByTestId('base-emotion-label-freude');
  });

  test('removes stale native nodes while modes and active state change', async () => {
    const rendered = await render(emotionLabel({
      isActive: false,
      mode: EMOTION_LABEL_MODES.EMOJI,
    }));
    await expectLabelNodes({ emoji: true, word: false });

    await rendered.rerender(emotionLabel({
      isActive: false,
      mode: EMOTION_LABEL_MODES.TEXT,
    }));
    await expectLabelNodes({ emoji: false, word: true });

    await rendered.rerender(emotionLabel({
      isActive: false,
      mode: EMOTION_LABEL_MODES.BOTH,
    }));
    await expectLabelNodes({ emoji: true, word: true });

    await rendered.rerender(emotionLabel({
      isActive: false,
      mode: EMOTION_LABEL_MODES.EMOJI,
    }));
    await expectLabelNodes({ emoji: true, word: false });

    await rendered.rerender(emotionLabel({
      isActive: true,
      mode: EMOTION_LABEL_MODES.EMOJI,
    }));
    await expectLabelNodes({ emoji: false, word: true });

    await rendered.rerender(emotionLabel({
      isActive: false,
      mode: EMOTION_LABEL_MODES.EMOJI,
    }));
    await expectLabelNodes({ emoji: true, word: false });
  });

  test('keeps only the current word while selection moves around the full star', async () => {
    const rendered = await render(emotionLabelRing(null));

    await expectOnlyActiveWord({
      activeEmotionId: EMOTION_IDS.JOY,
      rerender: rendered.rerender,
    });
    await expectOnlyActiveWord({
      activeEmotionId: EMOTION_IDS.LOVE,
      rerender: rendered.rerender,
    });
    await expectOnlyActiveWord({
      activeEmotionId: EMOTION_IDS.SHAME,
      rerender: rendered.rerender,
    });
    await expectOnlyActiveWord({
      activeEmotionId: EMOTION_IDS.DISGUST,
      rerender: rendered.rerender,
    });
    await expectOnlyActiveWord({
      activeEmotionId: EMOTION_IDS.SADNESS,
      rerender: rendered.rerender,
    });
    await expectOnlyActiveWord({
      activeEmotionId: EMOTION_IDS.ANGER,
      rerender: rendered.rerender,
    });
    await expectOnlyActiveWord({
      activeEmotionId: EMOTION_IDS.FEAR,
      rerender: rendered.rerender,
    });
    const screenshot = await screen.screenshot(
      await screen.findByTestId('emotion-label-ring'),
    );
    if (!screenshot) throw new Error('The native label ring screenshot is required.');
    await expect(screenshot).toMatchImageSnapshot({
      name: 'emoji-only-label-ring-after-selection-transitions',
      comparisonMethod: 'ssim',
      ssimThreshold: 0.98,
    });
  });
});

const styles = StyleSheet.create({
  singleLabel: {
    width: 240,
    height: 80,
  },
  labelRing: {
    width: 340,
    height: 120,
    backgroundColor: actionColors.primaryForeground,
  },
});
