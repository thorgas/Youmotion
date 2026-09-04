import { render } from '@testing-library/react-native';
import { StyleSheet, View } from 'react-native';

import {
  EMOTION_IDS,
  EMOTION_LABEL_MODES,
} from '@/constants';
import type { EmotionLabelMode } from '@/preferences/emotion-label-mode';
import { AppLocaleProvider } from '@/localization/app-locale-provider';
import type { Emotion } from '../domain/emotion';
import { EmotionAxisLabel } from '../ui/emotion-axis-label';

const emotion = {
  id: EMOTION_IDS.JOY,
  color: '#E7AD32',
  wash: '#F5D88E',
  nuanceCount: 7,
} satisfies Emotion;

type LabelCase = {
  title: string;
  mode: EmotionLabelMode;
  isActive: boolean;
  emojiLineHeight: number | null;
  wordLineHeight: number | null;
};

const labelCases = [
  {
    title: 'inactive emoji-only mode',
    mode: EMOTION_LABEL_MODES.EMOJI,
    isActive: false,
    emojiLineHeight: 27,
    wordLineHeight: null,
  },
  {
    title: 'active emoji-only mode',
    mode: EMOTION_LABEL_MODES.EMOJI,
    isActive: true,
    emojiLineHeight: null,
    wordLineHeight: 27,
  },
  {
    title: 'inactive text-only mode',
    mode: EMOTION_LABEL_MODES.TEXT,
    isActive: false,
    emojiLineHeight: null,
    wordLineHeight: 27,
  },
  {
    title: 'active text-only mode',
    mode: EMOTION_LABEL_MODES.TEXT,
    isActive: true,
    emojiLineHeight: null,
    wordLineHeight: 27,
  },
  {
    title: 'inactive combined mode',
    mode: EMOTION_LABEL_MODES.BOTH,
    isActive: false,
    emojiLineHeight: 27,
    wordLineHeight: 18,
  },
  {
    title: 'active combined mode',
    mode: EMOTION_LABEL_MODES.BOTH,
    isActive: true,
    emojiLineHeight: 27,
    wordLineHeight: 18,
  },
] satisfies readonly LabelCase[];

describe('emotion axis label layout', () => {
  it.each(labelCases)('renders $title without overlapping nodes', async ({
    emojiLineHeight,
    isActive,
    mode,
    wordLineHeight,
  }) => {
    const screen = await render(
      <AppLocaleProvider>
        <View>
          <EmotionAxisLabel
            emotion={emotion}
            isActive={isActive}
            labelMode={mode}
            x={120}
            y={40}
          />
        </View>
      </AppLocaleProvider>,
    );
    const emoji = screen.queryByTestId('base-emotion-emoji-freude');
    const word = screen.queryByTestId('base-emotion-label-freude');
    const axisStyle = StyleSheet.flatten(
      screen.getByTestId('base-emotion-axis-freude').props['style'],
    );
    const emojiStyle = emoji
      ? StyleSheet.flatten(emoji.props['style'])
      : null;
    const wordStyle = word
      ? StyleSheet.flatten(word.props['style'])
      : null;

    expect(axisStyle).toMatchObject({
      height: 54,
      left: 68,
      top: 13,
      width: 104,
    });
    expect(emojiStyle?.lineHeight ?? null).toBe(emojiLineHeight);
    expect(wordStyle?.lineHeight ?? null).toBe(wordLineHeight);
  });
});
