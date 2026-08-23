import { createContext, use, useMemo, type ReactNode } from 'react';
import { PressableScale } from 'pressto';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import assert from 'tiny-invariant';

import { actionColors, palette, type } from '@/theme';

type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost';
type ButtonSize = 'compact' | 'regular' | 'large';

type ButtonContextValue = {
  size: ButtonSize;
  variant: ButtonVariant;
};

const ButtonContext = createContext<ButtonContextValue | null>(null);
const buttonVariants = ['primary', 'secondary', 'destructive', 'ghost'] satisfies readonly ButtonVariant[];
const buttonSizes = ['compact', 'regular', 'large'] satisfies readonly ButtonSize[];

function ButtonRoot({
  children,
  disabled = false,
  label,
  loading = false,
  onPress,
  size = 'regular',
  style,
  testID,
  variant = 'primary',
}: {
  children: ReactNode;
  disabled?: boolean;
  label: string;
  loading?: boolean;
  onPress: () => void;
  size?: ButtonSize;
  style?: StyleProp<ViewStyle>;
  testID: string;
  variant?: ButtonVariant;
}) {
  assert(label.trim().length > 0, 'Button accessibility label must not be empty.');
  assert(buttonSizes.includes(size) && buttonVariants.includes(variant), 'Button size and variant must be supported.');
  const unavailable = disabled || loading;
  const contextValue = useMemo(() => ({ size, variant }), [size, variant]);

  return (
    <ButtonContext.Provider value={contextValue}>
      <PressableScale
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityState={{ busy: loading, disabled: unavailable }}
        disabled={disabled || loading}
        onPress={onPress}
        rippleColor={palette.hairline}
        style={[
          styles.root,
          rootSizes[size],
          rootVariants[variant],
          unavailable && styles.unavailable,
          style,
        ]}
        testID={testID}
      >
        {loading ? (
          <ActivityIndicator
            color={variant === 'primary' || variant === 'destructive'
              ? actionColors.primaryForeground
              : palette.ink}
            testID={`${testID}-loading`}
          />
        ) : children}
      </PressableScale>
    </ButtonContext.Provider>
  );
}

function ButtonText({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  const context = use(ButtonContext);
  assert(context !== null, 'Button.Text must be rendered inside Button.Root.');
  assert(buttonSizes.includes(context.size) && buttonVariants.includes(context.variant), 'Button text requires a supported root contract.');

  return (
    <Text style={[styles.text, textSizes[context.size], textVariants[context.variant], style]}>
      {children}
    </Text>
  );
}

const rootSizes = StyleSheet.create({
  compact: { minHeight: 44, borderRadius: 14, paddingHorizontal: 16 },
  regular: { minHeight: 50, borderRadius: 16, paddingHorizontal: 16 },
  large: { minHeight: 54, borderRadius: 18, paddingHorizontal: 18 },
});

const rootVariants = StyleSheet.create({
  primary: { backgroundColor: actionColors.primaryBackground },
  secondary: {
    backgroundColor: 'transparent',
    borderColor: palette.hairline,
    borderWidth: 1,
  },
  destructive: { backgroundColor: actionColors.destructiveBackground },
  ghost: { backgroundColor: 'transparent' },
});

const textSizes = StyleSheet.create({
  compact: { fontSize: 14 },
  regular: { fontSize: 14 },
  large: { fontSize: 15 },
});

const textVariants = StyleSheet.create({
  primary: { color: actionColors.primaryForeground },
  secondary: { color: palette.ink },
  destructive: { color: actionColors.primaryForeground },
  ghost: { color: palette.inkMuted },
});

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    borderCurve: 'continuous',
    justifyContent: 'center',
  },
  text: { fontFamily: type.semibold },
  unavailable: { opacity: 0.38 },
});

export const Button = Object.freeze({
  Root: ButtonRoot,
  Text: ButtonText,
});
