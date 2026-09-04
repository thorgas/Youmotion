import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { fbs } from 'fbtee';
import { PressableScale } from 'pressto';
import {
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { palette } from '@/theme';

type AppBackButtonProps = {
  disabled?: boolean;
  label?: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  testID: string;
};

const backSymbol: SymbolViewProps['name'] = {
  android: 'arrow_back',
  ios: 'chevron.left',
  web: 'arrow_back',
};

export function AppBackButton({
  disabled = false,
  label = String(fbs('Back', 'Label for the app-wide back navigation button')),
  onPress,
  style,
  testID,
}: AppBackButtonProps) {
  return (
    <PressableScale
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={onPress}
      style={[styles.button, disabled && styles.disabled, style]}
      testID={testID}
    >
      <SymbolView
        name={backSymbol}
        resizeMode="scaleAspectFit"
        size={18}
        tintColor={palette.moss}
        weight="semibold"
      />
      <Text style={styles.label}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: 44,
    minHeight: 44,
    alignSelf: 'flex-start',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
    paddingRight: 10,
  },
  disabled: {
    opacity: 0.42,
  },
  label: {
    color: palette.moss,
    fontSize: 17,
  },
});
