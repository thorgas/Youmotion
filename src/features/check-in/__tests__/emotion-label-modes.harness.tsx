import {
  describe,
  expect,
  render,
  test,
} from 'react-native-harness';
import { screen } from '@react-native-harness/ui';
import Svg from 'react-native-svg';

import {
  EMOTION_IDS,
  EMOTION_LABEL_MODES,
} from '@/constants';
import type { EmotionLabelMode } from '@/features/settings/domain/emotion-label-mode';
import { AppLocaleProvider } from '@/localization/app-locale-provider';
import type { Emotion } from '../domain/emotion';
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
      <Svg height={80} width={240}>
        <EmotionAxisLabel
          emotion={emotion}
          isActive={isActive}
          labelMode={mode}
          x={120}
          y={40}
        />
      </Svg>
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
});
