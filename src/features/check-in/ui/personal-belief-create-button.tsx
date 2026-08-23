import { PressableScale } from 'pressto';
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { actionColors, borderColors, palette, type } from '@/theme';

export function PersonalBeliefCreateButton({
  disabled = false,
  onPress,
  style,
  testID,
}: {
  disabled?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  testID: string;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, style]}
      testID={testID}
    >
      <View style={styles.copy}>
        <Text style={styles.title}>
          <fbt desc="Button for adding a personal core belief">Add your own core belief</fbt>
        </Text>
        <Text style={styles.help}>
          <fbt desc="Description below the button for adding a personal core belief">
            Write it in your own words.
          </fbt>
        </Text>
      </View>
      <View style={styles.badge}>
        <Text style={styles.plus}>+</Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 18,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: borderColors.moss28,
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  copy: { flex: 1 },
  title: { fontFamily: type.semibold, color: palette.moss, fontSize: 15 },
  help: {
    fontFamily: type.regular,
    color: palette.inkMuted,
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.moss,
  },
  plus: {
    fontFamily: type.regular,
    color: actionColors.primaryForeground,
    fontSize: 20,
    lineHeight: 23,
  },
});
