jest.mock('@react-native-async-storage/async-storage', () => (
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
));

jest.mock('react-native-surrealdb', () => {
  class SurrealRecordId {
    kind = 'record';

    constructor(value) {
      this.value = value;
    }
  }

  return {
    NONE: Object.freeze({ kind: 'none' }),
    SurrealRecordId,
  };
});

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Soft: 'soft' },
}));

jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageCode: 'en', languageTag: 'en-US' }]),
}));

jest.mock('expo-splash-screen', () => ({
  hide: jest.fn(),
  preventAutoHideAsync: jest.fn(() => Promise.resolve(true)),
}));

function mockReanimatedAnimationBuilder() {
  const builder = {
    delay: jest.fn(() => builder),
    duration: jest.fn(() => builder),
    reduceMotion: jest.fn(() => builder),
    withInitialValues: jest.fn(() => builder),
  };

  return builder;
}

jest.mock('react-native-reanimated', () => {
  const { Text, View } = require('react-native');

  return {
    __esModule: true,
    default: { Text, View, createAnimatedComponent: (component) => component },
    createAnimatedComponent: (component) => component,
    Easing: { bezier: jest.fn(() => (value) => value) },
    Extrapolation: { CLAMP: 'clamp' },
    FadeIn: mockReanimatedAnimationBuilder(),
    FadeInDown: mockReanimatedAnimationBuilder(),
    FadeOut: mockReanimatedAnimationBuilder(),
    interpolate: jest.fn((_value, _input, output) => output[0]),
    ReduceMotion: { Always: 'always', Never: 'never', System: 'system' },
    useAnimatedProps: jest.fn((props) => props()),
    useAnimatedStyle: jest.fn((style) => style()),
    useDerivedValue: jest.fn((derive) => ({ value: derive() })),
    useFrameCallback: jest.fn(),
    useReducedMotion: jest.fn(() => false),
    useSharedValue: jest.fn((initialValue) => {
      let value = initialValue;

      return {
        get: jest.fn(() => value),
        set: jest.fn((nextValue) => {
          value = nextValue;
        }),
        value,
      };
    }),
    withDelay: jest.fn((_delay, value) => value),
    withTiming: jest.fn((value) => value),
    ZoomIn: mockReanimatedAnimationBuilder(),
  };
});

jest.mock('pressto', () => {
  const React = require('react');
  const { Pressable } = require('react-native');

  return {
    PressableScale: Pressable,
    PressablesConfig: ({ children }) => React.createElement(React.Fragment, null, children),
  };
});

jest.mock('react-native-keyboard-controller', () => {
  const React = require('react');
  const { ScrollView } = require('react-native');

  return {
    KeyboardAwareScrollView: ScrollView,
    KeyboardProvider: ({ children }) => React.createElement(React.Fragment, null, children),
    useKeyboardState: (selector) => selector({ height: 0, isVisible: false }),
  };
});
