import { fbs } from 'fbtee';
import { Alert } from 'react-native';

const cancelText = () => String(fbs(
  'Cancel',
  'Button cancelling reminder deletion',
));
const deleteText = () => String(fbs(
  'Delete',
  'Button permanently deleting one reminder',
));
const deleteTitle = () => String(fbs(
  'Delete this reminder?',
  'Title confirming deletion of one reminder',
));
const deleteMessage = () => String(fbs(
  'Scheduled notifications will stop and this reminder will be removed permanently from this device.',
  'Explanation in reminder deletion confirmation',
));

export const deleteReminderText = () => String(fbs(
  'Delete',
  'Visible button for permanently deleting one reminder',
));

export const deleteReminderAccessibilityLabel = () => String(fbs(
  'Delete reminder',
  'Accessibility label for permanently deleting one reminder',
));

export function confirmReminderDeletion(onDelete: () => void) {
  Alert.alert(
    deleteTitle(),
    deleteMessage(),
    [
      { text: cancelText(), style: 'cancel' },
      { text: deleteText(), style: 'destructive', onPress: onDelete },
    ],
  );
}
