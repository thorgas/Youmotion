import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollViewProps,
} from 'react-native';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import {
  KeyboardAwareScrollView,
  type KeyboardAwareScrollViewProps,
  useReanimatedKeyboardAnimation,
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

type IndicatorMetricsInput = {
  contentHeight: number;
  keyboardHeight: number;
  scrollOffset: number;
  viewportHeight: number;
};

export function persistentScrollIndicatorMetrics({
  contentHeight,
  keyboardHeight,
  scrollOffset,
  viewportHeight,
}: IndicatorMetricsInput) {
  'worklet';
  assert(contentHeight >= 0, 'Scroll indicator content height must be non-negative.');
  assert(viewportHeight >= 0, 'Scroll indicator viewport height must be non-negative.');
  const keyboardInset = Math.max(-keyboardHeight, 0);
  if (contentHeight === 0 || viewportHeight === 0) {
    return { keyboardInset, opacity: 0, thumbHeight: 0, translateY: 0 };
  }
  const visibleViewportHeight = Math.max(viewportHeight - keyboardInset, 1);
  const trackHeight = Math.max(visibleViewportHeight - 12, 1);
  const overflow = Math.max(contentHeight - visibleViewportHeight, 0);
  const minimumThumbHeight = Math.min(36, trackHeight);
  const thumbHeight = Math.min(
    Math.max(trackHeight * visibleViewportHeight / contentHeight, minimumThumbHeight),
    trackHeight,
  );
  const travel = Math.max(trackHeight - thumbHeight, 0);
  const progress = overflow === 0
    ? 0
    : Math.min(Math.max(scrollOffset / overflow, 0), 1);

  return {
    keyboardInset,
    opacity: overflow > 1 ? 1 : 0,
    thumbHeight,
    translateY: progress * travel,
  };
}

function usePersistentScrollIndicator(keyboardHeight?: SharedValue<number>) {
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
    const metrics = persistentScrollIndicatorMetrics({
      contentHeight: contentHeight.value,
      keyboardHeight: keyboardHeight?.value ?? 0,
      scrollOffset: scrollOffset.value,
      viewportHeight: viewportHeight.value,
    });

    return {
      height: metrics.thumbHeight,
      opacity: metrics.opacity,
      transform: [{ translateY: metrics.translateY }],
    };
  });
  const trackStyle = useAnimatedStyle(() => ({
    bottom: 6 + Math.max(-(keyboardHeight?.value ?? 0), 0),
  }));

  return { _contentSizeChanged, _layout, _scrolled, thumbStyle, trackStyle };
}

export function PersistentScrollView({
  indicatorTestID,
  style,
  ...props
}: PersistentScrollViewProps) {
  const {
    _contentSizeChanged,
    _layout,
    _scrolled,
    thumbStyle,
    trackStyle,
  } = usePersistentScrollIndicator();

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
      <Animated.View pointerEvents="none" style={[styles.track, trackStyle]} testID={indicatorTestID}>
        <Animated.View style={[styles.thumb, thumbStyle]} />
      </Animated.View>
    </View>
  );
}

export function PersistentKeyboardAwareScrollView({
  indicatorTestID,
  style,
  ...props
}: PersistentKeyboardAwareScrollViewProps) {
  const keyboard = useReanimatedKeyboardAnimation();
  assert(keyboard.height !== undefined, 'Keyboard animation height must be available.');
  assert(keyboard.progress !== undefined, 'Keyboard animation progress must be available.');
  const {
    _contentSizeChanged,
    _layout,
    _scrolled,
    thumbStyle,
    trackStyle,
  } = usePersistentScrollIndicator(keyboard.height);

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
      <Animated.View pointerEvents="none" style={[styles.track, trackStyle]} testID={indicatorTestID}>
        <Animated.View style={[styles.thumb, thumbStyle]} />
      </Animated.View>
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
