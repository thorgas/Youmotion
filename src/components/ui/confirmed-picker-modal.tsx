import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PressableScale } from 'pressto';

import { Dialog } from '@/components/ui/dialog';
import { actionColors, palette, type } from '@/theme';

export function ConfirmedPickerModal({
  children,
  doneLabel,
  onDone,
  testID,
  title,
  visible,
}: {
  children: ReactNode;
  doneLabel: string;
  onDone: () => void;
  testID: string;
  title: string;
  visible: boolean;
}) {
  return (
    <Dialog.Root onRequestClose={onDone} style={styles.backdrop} testID={testID} tone="picker" visible={visible}>
      <Dialog.Content style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.picker}>{children}</View>
          <PressableScale
            accessibilityRole="button"
            onPress={onDone}
            style={styles.done}
            testID={`${testID}-done`}
          >
            <Text style={styles.doneText}>{doneLabel}</Text>
          </PressableScale>
      </Dialog.Content>
    </Dialog.Root>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 16,
    paddingBottom: 28,
  },
  card: {
    backgroundColor: palette.paper,
    borderRadius: 24,
    borderCurve: 'continuous',
    padding: 16,
    gap: 12,
    boxShadow: '0 18px 48px rgba(20, 23, 20, 0.18)',
  },
  title: {
    color: palette.ink,
    fontFamily: type.semibold,
    fontSize: 17,
    paddingHorizontal: 4,
    paddingTop: 2,
  },
  picker: { alignItems: 'stretch', minHeight: 180, justifyContent: 'center' },
  done: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: actionColors.primaryBackground,
  },
  doneText: { color: actionColors.primaryForeground, fontFamily: type.semibold, fontSize: 16 },
});
