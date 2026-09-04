import { fbs } from 'fbtee';
import { Alert } from 'react-native';

const cancelText = () => String(fbs(
  'Cancel',
  'Button cancelling removal of a personal core belief',
));
const removeText = () => String(fbs(
  'Remove',
  'Button removing a personal core belief from future choices',
));
const removeTitle = () => String(fbs(
  'Remove this core belief?',
  'Title confirming removal of a personal core belief',
));
const removeMessage = () => String(fbs(
  'It will no longer appear in future suggestions. Earlier moments keep their wording.',
  'Explanation that removing a personal core belief preserves historical moments',
));

export function confirmBeliefRemoval(onRemove: () => void) {
  Alert.alert(
    removeTitle(),
    removeMessage(),
    [
      { text: cancelText(), style: 'cancel' },
      { text: removeText(), style: 'destructive', onPress: onRemove },
    ],
  );
}
