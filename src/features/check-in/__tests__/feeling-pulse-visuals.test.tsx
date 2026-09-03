import { render } from '@testing-library/react-native';

import { AppLocaleProvider } from '@/localization/app-locale-provider';
import { BASE_RIPPLE_PHASES } from '@/constants';
import { EmotionStar } from '../ui/emotion-star';

const emotionStarProps = {
  onCancel: jest.fn(),
  onRelease: jest.fn(),
  onSelectionChange: jest.fn(),
  onTouchStart: jest.fn(),
  selection: null,
};

describe('Feeling Pulse visual surface', () => {
  it('renders no fixed guide waves behind the movable ripple field', async () => {
    const screen = await render(
      <AppLocaleProvider>
        <EmotionStar {...emotionStarProps} />
      </AppLocaleProvider>,
    );

    expect(screen.queryByTestId('feeling-pulse-guides')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('feeling-pulse-guide')).not.toBeOnTheScreen();
    expect(screen.getAllByTestId('water-ripple-ring')).toHaveLength(
      BASE_RIPPLE_PHASES.length,
    );
  });

  it('keeps one raised peak centered beneath the movable origin', async () => {
    const screen = await render(
      <AppLocaleProvider>
        <EmotionStar {...emotionStarProps} />
      </AppLocaleProvider>,
    );

    expect(screen.getAllByTestId('feeling-pulse-peak')).toHaveLength(1);
    expect(screen.getAllByTestId('ripple-origin')).toHaveLength(1);
    expect(screen.getByTestId('feeling-pulse-peak')).toHaveStyle({
      boxShadow: '-4px -5px 10px rgba(255, 255, 255, 0.74), 5px 7px 13px rgba(42, 39, 34, 0.10)',
    });
    expect(screen.getByTestId('feeling-pulse-peak')).toContainElement(
      screen.getByTestId('ripple-origin'),
    );
  });

  it('keeps one peak while a single trailing wave field remembers the prior position', async () => {
    const screen = await render(
      <AppLocaleProvider>
        <EmotionStar {...emotionStarProps} />
      </AppLocaleProvider>,
    );

    expect(screen.getAllByTestId('feeling-pulse-memory')).toHaveLength(1);
    expect(screen.getAllByTestId('feeling-pulse-memory-ring')).toHaveLength(
      BASE_RIPPLE_PHASES.length,
    );
    expect(screen.getAllByTestId('feeling-pulse-peak')).toHaveLength(1);
    expect(screen.getByTestId('feeling-pulse-memory')).not.toContainElement(
      screen.getByTestId('feeling-pulse-peak'),
    );
  });
});
