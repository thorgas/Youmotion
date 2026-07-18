import { render } from '@testing-library/react-native';
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

type LabelCase = {
  title: string;
  mode: EmotionLabelMode;
  isActive: boolean;
  emojiY: readonly number[] | null;
  wordY: readonly number[] | null;
};

const labelCases = [
  {
    title: 'inactive emoji-only mode',
    mode: EMOTION_LABEL_MODES.EMOJI,
    isActive: false,
    emojiY: [40],
    wordY: null,
  },
  {
    title: 'active emoji-only mode',
    mode: EMOTION_LABEL_MODES.EMOJI,
    isActive: true,
    emojiY: null,
    wordY: [40],
  },
  {
    title: 'inactive text-only mode',
    mode: EMOTION_LABEL_MODES.TEXT,
    isActive: false,
    emojiY: null,
    wordY: [40],
  },
  {
    title: 'active text-only mode',
    mode: EMOTION_LABEL_MODES.TEXT,
    isActive: true,
    emojiY: null,
    wordY: [40],
  },
  {
    title: 'inactive combined mode',
    mode: EMOTION_LABEL_MODES.BOTH,
    isActive: false,
    emojiY: [31],
    wordY: [51],
  },
  {
    title: 'active combined mode',
    mode: EMOTION_LABEL_MODES.BOTH,
    isActive: true,
    emojiY: [31],
    wordY: [51],
  },
] satisfies readonly LabelCase[];

describe('emotion axis label layout', () => {
  it.each(labelCases)('renders $title without overlapping nodes', async ({
    emojiY,
    isActive,
    mode,
    wordY,
  }) => {
    const screen = await render(
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
      </AppLocaleProvider>,
    );
    const emoji = screen.queryByTestId('base-emotion-emoji-freude');
    const word = screen.queryByTestId('base-emotion-label-freude');

    expect(emoji?.props['y'] ?? null).toEqual(emojiY);
    expect(word?.props['y'] ?? null).toEqual(wordY);
  });
});
