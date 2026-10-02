import { describe, expect, render, test } from 'react-native-harness';
import { screen } from '@react-native-harness/ui';
import { Text, View } from 'react-native';

import {
  persistentScrollIndicatorMetrics,
  PersistentScrollView,
} from '@/components/ui/persistent-scroll-view';

describe('native scroll indicator zero measurements', () => {
  test('handles a detached viewport in the installed Hermes runtime', () => {
    expect(persistentScrollIndicatorMetrics({
      contentHeight: 700,
      viewportHeight: 0,
      keyboardHeight: 0,
      scrollOffset: 100,
    })).toEqual({ keyboardInset: 0, opacity: 0, thumbHeight: 0, translateY: 0 });
  });

  test('renders a collapsed native scroll view and recovers after layout', async () => {
    const collapsed = (
      <View style={{ height: 0 }}>
        <PersistentScrollView testID="native-zero-scroll">
          <Text>Disposable scroll measurement fixture</Text>
        </PersistentScrollView>
      </View>
    );
    const { rerender } = await render(collapsed);
    expect(await screen.findByTestId('native-zero-scroll')).toBeDefined();
    await rerender(
      <View style={{ height: 300 }}>
        <PersistentScrollView testID="native-positive-scroll">
          <Text>Disposable scroll measurement fixture</Text>
        </PersistentScrollView>
      </View>,
    );
    expect(await screen.findByTestId('native-positive-scroll')).toBeDefined();
  });
});
