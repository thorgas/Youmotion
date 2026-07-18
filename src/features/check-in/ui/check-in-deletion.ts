import { fbs } from 'fbtee';
import { Alert } from 'react-native';

const _cancelDeleteText = () => String(fbs('Cancel', 'Button cancelling check-in deletion'));
const _deleteText = () => String(fbs('Delete', 'Button deleting a check-in'));
const _deleteTitle = () => String(fbs('Delete this moment?', 'Title confirming check-in deletion'));
const _deleteMessage = () => String(fbs(
  'This moment will be removed permanently from this device.',
  'Explanation in check-in deletion confirmation',
));

export const deleteMomentText = () => String(fbs(
  'Delete moment',
  'Visible button for permanently deleting a captured moment',
));

export const deleteMomentAccessibilityLabel = () => String(fbs(
  'Delete moment',
  'Accessibility label for permanently deleting a captured moment',
));

export const editMomentAccessibilityHint = () => String(fbs(
  'Opens this moment. Long press to delete it.',
  'Accessibility hint for a history moment with long-press deletion',
));

export function confirmCheckInDeletion(onDelete: () => void) {
  Alert.alert(
    _deleteTitle(),
    _deleteMessage(),
    [
      { text: _cancelDeleteText(), style: 'cancel' },
      { text: _deleteText(), style: 'destructive', onPress: onDelete },
    ],
  );
}
