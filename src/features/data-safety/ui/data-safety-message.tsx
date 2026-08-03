import { fbs } from 'fbtee';
import { Pressable, StyleSheet, Text } from 'react-native';

import {
  DATA_ARCHIVE_FAILURE_MESSAGE,
  DATA_DELETE_ALL_FAILURE_MESSAGE,
  DATA_EXPORT_FAILURE_MESSAGE,
  DATA_RESTORE_FAILURE_MESSAGE,
} from '@/constants';
import { palette, type } from '@/features/check-in/ui/theme';

const localizedDataSafetyMessage = (message: string) => {
  if (message === 'Your backup is ready.') {
    return String(fbs('Your backup is ready.', 'Successful data backup export notice'));
  }
  if (message === 'Your backup replaced the data on this device.') {
    return String(fbs(
      'Your backup replaced the data on this device.',
      'Successful data backup restore notice',
    ));
  }
  if (message === 'Your moments and personal beliefs were deleted.') {
    return String(fbs(
      'Your moments and personal beliefs were deleted.',
      'Successful deletion of all journal data notice',
    ));
  }
  if (message === DATA_EXPORT_FAILURE_MESSAGE) {
    return String(fbs('Your backup could not be created.', 'Data backup export failure notice'));
  }
  if (message === DATA_ARCHIVE_FAILURE_MESSAGE) {
    return String(fbs('That backup could not be opened.', 'Data backup file opening failure notice'));
  }
  if (message === DATA_RESTORE_FAILURE_MESSAGE) {
    return String(fbs(
      'Your data was not changed because the backup could not be restored.',
      'Data backup restore failure notice',
    ));
  }
  if (message === DATA_DELETE_ALL_FAILURE_MESSAGE) {
    return String(fbs('Your moments could not be deleted.', 'Delete all journal data failure notice'));
  }
  return message;
};

export function DataSafetyMessage({
  error,
  notice,
  onDismiss,
}: {
  error: string | null;
  notice: string | null;
  onDismiss: () => void;
}) {
  const message = error ?? notice;
  if (!message) return null;
  return (
    <Pressable
      accessibilityRole={error ? 'alert' : 'button'}
      onPress={onDismiss}
      style={[styles.notice, error ? styles.errorNotice : null]}
      testID={error ? 'data-safety-error' : 'data-safety-notice'}
    >
      <Text style={styles.noticeText}>{localizedDataSafetyMessage(message)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  notice: { backgroundColor: '#EDF0EB', borderRadius: 14, marginTop: 14, padding: 14 },
  errorNotice: { backgroundColor: '#F5E8E5' },
  noticeText: { fontFamily: type.medium, color: palette.ink, fontSize: 13, lineHeight: 19 },
});
