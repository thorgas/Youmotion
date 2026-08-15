import { PressableScale } from 'pressto';
import { StyleSheet, Text, View } from 'react-native';

import { palette, type } from '@/features/check-in/ui/theme';

export function SettingsActionRow({
  count,
  description,
  onPress,
  testID,
  title,
}: {
  count?: number;
  description: string;
  onPress: () => void;
  testID: string;
  title: string;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      onPress={onPress}
      style={styles.actionRow}
      testID={testID}
    >
      <View style={styles.actionCopy}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionDescription}>{description}</Text>
      </View>
      {count === undefined ? null : <Text style={styles.actionCount}>{count}</Text>}
      <Text accessibilityElementsHidden style={styles.actionChevron}>›</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  actionCopy: { flex: 1 },
  actionTitle: { fontFamily: type.semibold, color: palette.ink, fontSize: 15 },
  actionDescription: {
    fontFamily: type.regular,
    color: palette.inkMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  actionCount: {
    minWidth: 28,
    minHeight: 28,
    borderRadius: 14,
    backgroundColor: '#EDF0EB',
    fontFamily: type.semibold,
    color: palette.moss,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 28,
  },
  actionChevron: {
    fontFamily: type.regular,
    color: palette.inkMuted,
    fontSize: 24,
    lineHeight: 24,
  },
});
