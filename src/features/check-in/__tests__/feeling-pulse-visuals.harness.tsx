import {
  describe,
  expect,
  render,
  test,
} from 'react-native-harness';
import { screen } from '@react-native-harness/ui';

import { EMOTION_LABEL_MODES } from '@/constants';
import { appSettingsStore } from '@/features/settings/application/app-settings.store';
import { AppLocaleProvider } from '@/localization/app-locale-provider';
import { EmotionStar } from '../ui/emotion-star';

describe('Feeling Pulse visual surface on the device runtime', () => {
  test('mounts four circular guides and one movable raised peak', async () => {
    appSettingsStore.trigger.hydrated({
      settings: {
        locale: null,
        emotionLabelMode: EMOTION_LABEL_MODES.EMOJI,
        onboardingCompleted: true,
      },
    });

    await render(
      <AppLocaleProvider>
        <EmotionStar
          onCancel={jest.fn()}
          onRelease={jest.fn()}
          onSelectionChange={jest.fn()}
          onTouchStart={jest.fn()}
          selection={null}
        />
      </AppLocaleProvider>,
    );

    expect(await screen.findAllByTestId('feeling-pulse-guide')).toHaveLength(4);
    expect(await screen.findAllByTestId('feeling-pulse-guide-highlight')).toHaveLength(4);
    expect(await screen.findAllByTestId('feeling-pulse-guide-shadow')).toHaveLength(4);
    expect(await screen.findAllByTestId('feeling-pulse-peak')).toHaveLength(1);
    expect(await screen.findAllByTestId('ripple-origin')).toHaveLength(1);
  });
});
