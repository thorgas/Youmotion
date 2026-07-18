import { act, fireEvent, render } from '@testing-library/react-native';
import { Text } from 'react-native';

import {
  SPLASH_OVERLAY_FADE_DURATION,
  SPLASH_OVERLAY_VISIBLE_DURATION,
} from '@/constants';
import { AnimatedSplashScreen } from '../ui/animated-splash-screen';

describe('animated splash screen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('matches the native first frame before revealing the app', async () => {
    const screen = await render(
      <AnimatedSplashScreen>
        <Text>App content</Text>
      </AnimatedSplashScreen>,
    );

    expect(screen.getByText('App content')).toBeTruthy();
    expect(screen.getByTestId('animated-splash-overlay')).toBeTruthy();
    expect(screen.getByTestId('youmotion-splash-logo')).toBeTruthy();
  });

  it('removes the overlay after the reveal and fade finish', async () => {
    const screen = await render(
      <AnimatedSplashScreen>
        <Text>App content</Text>
      </AnimatedSplashScreen>,
    );

    await fireEvent(screen.getByTestId('youmotion-splash-logo-base'), 'load');
    await fireEvent(screen.getByTestId('animated-splash-root'), 'layout');
    await act(() => {
      jest.advanceTimersByTime(
        SPLASH_OVERLAY_VISIBLE_DURATION + SPLASH_OVERLAY_FADE_DURATION,
      );
    });

    expect(screen.queryByTestId('animated-splash-overlay')).toBeNull();
    expect(screen.getByText('App content')).toBeTruthy();
  });
});
