import type { ReactNode } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { overlayColors } from '@/theme';

type DialogBackdropTone = 'dialog' | 'feedback' | 'picker';

function DialogRoot({
  children,
  onRequestClose,
  style,
  testID,
  tone,
  visible,
}: {
  children: ReactNode;
  onRequestClose: () => void;
  style?: StyleProp<ViewStyle>;
  testID: string;
  tone: DialogBackdropTone;
  visible: boolean;
}) {
  return (
    <Modal
      animationType="fade"
      onRequestClose={onRequestClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={[styles.layer, style]} testID={testID}>
        <Pressable
          accessibilityElementsHidden
          importantForAccessibility="no"
          onPress={onRequestClose}
          style={[styles.backdrop, backdropTones[tone]]}
          testID={`${testID}-backdrop`}
        />
        {children}
      </View>
    </Modal>
  );
}

function DialogContent({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View accessibilityViewIsModal style={style}>{children}</View>;
}

const backdropTones = StyleSheet.create({
  dialog: { backgroundColor: overlayColors.dialog },
  feedback: { backgroundColor: overlayColors.feedback },
  picker: { backgroundColor: overlayColors.picker },
});

const styles = StyleSheet.create({
  backdrop: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  layer: { flex: 1 },
});

export const Dialog = Object.freeze({
  Content: DialogContent,
  Root: DialogRoot,
});
