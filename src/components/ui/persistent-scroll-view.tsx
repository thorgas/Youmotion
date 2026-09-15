import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollViewProps,
} from 'react-native';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import {
  KeyboardAwareScrollView,
  type KeyboardAwareScrollViewProps,
} from 'react-native-keyboard-controller';

import assert from '@/assert';
import { palette } from '@/theme';

type IndicatorProps = {
  indicatorTestID?: string;
};

type ManagedScrollProps =
  | 'horizontal'
  | 'onContentSizeChange'
  | 'onLayout'
  | 'onScroll'
  | 'persistentScrollbar'
  | 'showsVerticalScrollIndicator';

type PersistentScrollViewProps = Omit<ScrollViewProps, ManagedScrollProps> & IndicatorProps;
type PersistentKeyboardAwareScrollViewProps = Omit<KeyboardAwareScrollViewProps, ManagedScrollProps> & IndicatorProps;

function usePersistentScrollIndicator() {
  const initialViewportHeight = 1;
  const initialContentHeight = 1;
  assert(initialViewportHeight > 0, 'Scroll indicator viewport height must start positive.');
  assert(initialContentHeight > 0, 'Scroll indicator content height must start positive.');
  const viewportHeight = useSharedValue(initialViewportHeight);
  const contentHeight = useSharedValue(initialContentHeight);
  const scrollOffset = useSharedValue(0);

  const _layout = (event: LayoutChangeEvent) => {
    assert(event.nativeEvent.layout.height >= 0, 'Scroll viewport height must be non-negative.');
    viewportHeight.value = event.nativeEvent.layout.height;
  };
  const _contentSizeChanged: NonNullable<ScrollViewProps['onContentSizeChange']> = (...[, height]) => {
    assert(height >= 0, 'Scroll content height must be non-negative.');
    contentHeight.value = height;
  };
  const _scrolled = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollOffset.value = event.nativeEvent.contentOffset.y;
  };
  const thumbStyle = useAnimatedStyle(() => {
    const trackHeight = Math.max(viewportHeight.value - 12, 1);
    const overflow = Math.max(contentHeight.value - viewportHeight.value, 0);
    const thumbHeight = Math.max(
      Math.min(trackHeight * viewportHeight.value / contentHeight.value, trackHeight),
      36,
    );
    const travel = Math.max(trackHeight - thumbHeight, 0);
    const progress = overflow === 0
      ? 0
      : Math.min(Math.max(scrollOffset.value / overflow, 0), 1);
    assert(thumbHeight >= 36, 'Scroll indicator thumb must remain touch-visible.');
    assert(progress >= 0 && progress <= 1, 'Scroll indicator progress must remain normalized.');

    return {
      height: thumbHeight,
      opacity: overflow > 1 ? 1 : 0,
      transform: [{ translateY: progress * travel }],
    };
  });

  return { _contentSizeChanged, _layout, _scrolled, thumbStyle };
}

export function PersistentScrollView({
  indicatorTestID,
  style,
  ...props
}: PersistentScrollViewProps) {
  const { _contentSizeChanged, _layout, _scrolled, thumbStyle } = usePersistentScrollIndicator();

  return (
    <View style={[styles.frame, style]}>
      <ScrollView
        {...props}
        onContentSizeChange={_contentSizeChanged}
        onLayout={_layout}
        onScroll={_scrolled}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
      />
      <View pointerEvents="none" style={styles.track} testID={indicatorTestID}>
        <Animated.View style={[styles.thumb, thumbStyle]} />
      </View>
    </View>
  );
}

export function PersistentKeyboardAwareScrollView({
  indicatorTestID,
  style,
  ...props
}: PersistentKeyboardAwareScrollViewProps) {
  const { _contentSizeChanged, _layout, _scrolled, thumbStyle } = usePersistentScrollIndicator();

  return (
    <View style={[styles.frame, style]}>
      <KeyboardAwareScrollView
        {...props}
        onContentSizeChange={_contentSizeChanged}
        onLayout={_layout}
        onScroll={_scrolled}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
      />
      <View pointerEvents="none" style={styles.track} testID={indicatorTestID}>
        <Animated.View style={[styles.thumb, thumbStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1 },
  scroll: { flex: 1 },
  track: {
    position: 'absolute',
    top: 6,
    right: 5,
    bottom: 6,
    width: 3,
  },
  thumb: {
    width: 3,
    borderRadius: 2,
    backgroundColor: palette.inkMuted,
    opacity: 0,
  },
});
