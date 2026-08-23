import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { PressableScale } from 'pressto';

import { actionColors, overlayColors, palette, type } from '@/theme';

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
    <Modal
      animationType="fade"
      onRequestClose={onDone}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.backdrop} testID={testID}>
        <Pressable
          accessibilityElementsHidden
          importantForAccessibility="no"
          onPress={onDone}
          style={styles.dismissArea}
          testID={`${testID}-backdrop`}
        />
        <View accessibilityViewIsModal style={styles.card}>
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
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: overlayColors.picker,
    padding: 16,
    paddingBottom: 28,
  },
  dismissArea: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
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
