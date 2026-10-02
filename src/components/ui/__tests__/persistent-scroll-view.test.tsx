import { render, screen, within } from '@testing-library/react-native';
import { Text } from 'react-native';

import {
  persistentScrollIndicatorMetrics,
  PersistentKeyboardAwareScrollView,
  PersistentScrollView,
} from '@/components/ui/persistent-scroll-view';

describe('persistent scroll views', () => {
  it.each([
    { contentHeight: 700, viewportHeight: 0 },
    { contentHeight: 0, viewportHeight: 700 },
    { contentHeight: 0, viewportHeight: 0 },
  ])('hides the indicator for native zero measurements: %o', (measurements) => {
    expect(persistentScrollIndicatorMetrics({
      ...measurements,
      keyboardHeight: -320,
      scrollOffset: 100,
    })).toEqual({ keyboardInset: 320, opacity: 0, thumbHeight: 0, translateY: 0 });
  });

  it('shows and constrains the indicator to the viewport left above the keyboard', () => {
    const closed = persistentScrollIndicatorMetrics({
      contentHeight: 700,
      keyboardHeight: 0,
      scrollOffset: 0,
      viewportHeight: 700,
    });
    const open = persistentScrollIndicatorMetrics({
      contentHeight: 700,
      keyboardHeight: -320,
      scrollOffset: 0,
      viewportHeight: 700,
    });

    expect(closed.opacity).toBe(0);
    expect(open.keyboardInset).toBe(320);
    expect(open.opacity).toBe(1);
    expect(open.thumbHeight).toBeLessThan(700 - 320 - 12);
  });

  it('keeps the indicator outside regular scroll content without intercepting touches', async () => {
    await render(
      <PersistentScrollView indicatorTestID="scroll-indicator" testID="scroll-content">
        <Text>Long-form content</Text>
      </PersistentScrollView>,
    );

    const scroll = screen.getByTestId('scroll-content');
    const indicator = screen.getByTestId('scroll-indicator');
    expect(scroll).toHaveProp('showsVerticalScrollIndicator', false);
    expect(scroll).toHaveProp('scrollEventThrottle', 16);
    expect(indicator).toHaveProp('pointerEvents', 'none');
    expect(within(scroll).queryByTestId('scroll-indicator')).not.toBeOnTheScreen();
  });

  it('provides the same non-overlapping indicator for keyboard-aware forms', async () => {
    await render(
      <PersistentKeyboardAwareScrollView
        bottomOffset={82}
        indicatorTestID="keyboard-scroll-indicator"
        testID="keyboard-scroll-content"
      >
        <Text>Editable content</Text>
      </PersistentKeyboardAwareScrollView>,
    );

    const scroll = screen.getByTestId('keyboard-scroll-content');
    expect(scroll).toHaveProp('bottomOffset', 82);
    expect(scroll).toHaveProp('showsVerticalScrollIndicator', false);
    expect(screen.getByTestId('keyboard-scroll-indicator')).toHaveProp('pointerEvents', 'none');
    expect(within(scroll).queryByTestId('keyboard-scroll-indicator')).not.toBeOnTheScreen();
  });
});
