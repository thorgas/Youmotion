import { render, screen, within } from '@testing-library/react-native';
import { Text } from 'react-native';

import {
  PersistentKeyboardAwareScrollView,
  PersistentScrollView,
} from '@/components/ui/persistent-scroll-view';

describe('persistent scroll views', () => {
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
