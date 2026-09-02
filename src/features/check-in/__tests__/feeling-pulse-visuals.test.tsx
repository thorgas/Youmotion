import { render } from '@testing-library/react-native';

import { AppLocaleProvider } from '@/localization/app-locale-provider';
import { EmotionStar } from '../ui/emotion-star';

const emotionStarProps = {
  onCancel: jest.fn(),
  onRelease: jest.fn(),
  onSelectionChange: jest.fn(),
  onTouchStart: jest.fn(),
  selection: null,
};

describe('Feeling Pulse visual surface', () => {
  it('renders four fully round embossed intensity guides', async () => {
    const screen = await render(
      <AppLocaleProvider>
        <EmotionStar {...emotionStarProps} />
      </AppLocaleProvider>,
    );

    expect(screen.getAllByTestId('feeling-pulse-guide')).toHaveLength(4);
    expect(screen.getAllByTestId('feeling-pulse-guide-highlight')).toHaveLength(4);
    expect(screen.getAllByTestId('feeling-pulse-guide-shadow')).toHaveLength(4);

    for (const guide of screen.getAllByTestId('feeling-pulse-guide')) {
      expect(guide.props['cx']).toBe(guide.props['cy']);
      expect(guide.props['strokeDasharray']).toBeUndefined();
    }
  });

  it('keeps one raised peak centered beneath the movable origin', async () => {
    const screen = await render(
      <AppLocaleProvider>
        <EmotionStar {...emotionStarProps} />
      </AppLocaleProvider>,
    );

    expect(screen.getAllByTestId('feeling-pulse-peak')).toHaveLength(1);
    expect(screen.getAllByTestId('ripple-origin')).toHaveLength(1);
    expect(screen.getByTestId('feeling-pulse-peak')).toContainElement(
      screen.getByTestId('ripple-origin'),
    );
  });
});
