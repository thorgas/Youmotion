import { StyleSheet, Text } from 'react-native';

import { palette, type } from '@/theme';

export function HarmfulBeliefCardLabel() {
  return (
    <Text style={styles.label}>
      <fbt desc="Label above the attached harmful belief on the guiding page">
        Your core belief
      </fbt>
    </Text>
  );
}

export function GuidingBeliefCardLabel() {
  return (
    <Text style={styles.label}>
      <fbt desc="Label above the new positive guiding belief input">
        Your new guiding belief
      </fbt>
    </Text>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: type.semibold,
    color: palette.inkMuted,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
