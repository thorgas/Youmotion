import { Text, View } from 'react-native';

function immediateAnimationBuilder() {
  const builder = {
    delay: () => builder,
    duration: () => builder,
    reduceMotion: () => builder,
    withInitialValues: () => builder,
  };
  return builder;
}

export const Easing = { bezier: () => (value: number) => value };
export const Extrapolation = { CLAMP: 'clamp' };
export const FadeIn = immediateAnimationBuilder();
export const FadeInDown = immediateAnimationBuilder();
export const FadeOut = immediateAnimationBuilder();
export const ReduceMotion = { Always: 'always', Never: 'never', System: 'system' };
export const ZoomIn = immediateAnimationBuilder();

export function createAnimatedComponent<Component>(component: Component) {
  return component;
}

/* oxlint-disable-next-line architecture/no-multiple-function-params -- Mirrors Reanimated's public API; covered by animation-using Harness suites. */
export function interpolate<Value>(
  _value: number,
  _input: readonly number[],
  output: readonly Value[],
) {
  return output[0];
}

export function useAnimatedProps<Props>(createProps: () => Props) {
  return createProps();
}

export function useAnimatedReaction() {}

export function useAnimatedStyle<Style>(createStyle: () => Style) {
  return createStyle();
}

export function useDerivedValue<Value>(derive: () => Value) {
  return { value: derive() };
}

export function useFrameCallback() {}

export function useReducedMotion() {
  return false;
}

export function makeMutable<Value>(initialValue: Value) {
  let currentValue = initialValue;
  return {
    get value() {
      return currentValue;
    },
    set value(nextValue: Value) {
      currentValue = nextValue;
    },
    get: () => currentValue,
    set: (nextValue: Value) => {
      currentValue = nextValue;
    },
  };
}

export function useSharedValue<Value>(initialValue: Value) {
  return makeMutable(initialValue);
}

/* oxlint-disable-next-line architecture/no-multiple-function-params -- Mirrors Reanimated's public API; covered by animation-using Harness suites. */
export function withDelay<Value>(_delay: number, value: Value) {
  return value;
}

export function withTiming<Value>(value: Value) {
  return value;
}

const Animated = {
  Text,
  View,
  createAnimatedComponent,
};

export default Animated;
