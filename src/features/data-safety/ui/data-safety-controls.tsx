import { useSelector } from '@xstate/react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  DATA_SAFETY_EVENTS,
  DATA_SAFETY_STATES,
  NAVIGATION_STATES,
} from '@/constants';
import { palette, type } from '@/features/check-in/ui/theme';
import { formatHistoryDate } from '@/localization/date-copy';
import {
  type AppNavigationActor,
  useAppNavigationActor,
} from '@/navigation/app-navigation.provider';
import { dataArchiveSummary } from '../domain/data-archive';

type DataSafetyView = {
  archive: ReturnType<AppNavigationActor['getSnapshot']>['context']['dataArchive'];
  busy: boolean;
  deleting: boolean;
  deleteConfirmation: boolean;
  error: string | null;
  exporting: boolean;
  notice: string | null;
  picking: boolean;
  restoring: boolean;
  restorePreview: boolean;
};

const _selectDataSafetyView = (
  snapshot: ReturnType<AppNavigationActor['getSnapshot']>,
): DataSafetyView => {
  const deleting = snapshot.matches({
    [NAVIGATION_STATES.TABS]: {
      [NAVIGATION_STATES.SETTINGS]: DATA_SAFETY_STATES.DELETING,
    },
  });
  const exporting = snapshot.matches({
    [NAVIGATION_STATES.TABS]: {
      [NAVIGATION_STATES.SETTINGS]: DATA_SAFETY_STATES.EXPORTING,
    },
  });
  const picking = snapshot.matches({
    [NAVIGATION_STATES.TABS]: {
      [NAVIGATION_STATES.SETTINGS]: DATA_SAFETY_STATES.PICKING_ARCHIVE,
    },
  });
  const restoring = snapshot.matches({
    [NAVIGATION_STATES.TABS]: {
      [NAVIGATION_STATES.SETTINGS]: DATA_SAFETY_STATES.RESTORING,
    },
  });
  return {
    archive: snapshot.context.dataArchive,
    busy: deleting || exporting || picking || restoring,
    deleting,
    deleteConfirmation: snapshot.matches({
    [NAVIGATION_STATES.TABS]: {
      [NAVIGATION_STATES.SETTINGS]: DATA_SAFETY_STATES.DELETE_CONFIRMATION,
    },
    }),
    error: snapshot.context.dataSafetyError,
    exporting,
    notice: snapshot.context.dataSafetyNotice,
    picking,
    restoring,
    restorePreview: snapshot.matches({
      [NAVIGATION_STATES.TABS]: {
        [NAVIGATION_STATES.SETTINGS]: DATA_SAFETY_STATES.RESTORE_PREVIEW,
      },
    }),
  };
};

function DataAction({
  busy,
  description,
  disabled,
  destructive = false,
  onPress,
  testID,
  title,
}: {
  busy: boolean;
  description: React.ReactNode;
  disabled: boolean;
  destructive?: boolean;
  onPress: () => void;
  testID: string;
  title: React.ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={styles.action}
      testID={testID}
    >
      <View style={styles.actionCopy}>
        <Text style={[styles.actionTitle, destructive ? styles.destructiveText : null]}>
          {title}
        </Text>
        <Text style={styles.actionDescription}>{description}</Text>
      </View>
      {busy ? <ActivityIndicator color={palette.inkMuted} /> : (
        <Text accessibilityElementsHidden style={styles.chevron}>›</Text>
      )}
    </Pressable>
  );
}

function RestorePreviewCard({
  locale,
  onCancel,
  onConfirm,
  summary,
}: {
  locale: string;
  onCancel: () => void;
  onConfirm: () => void;
  summary: ReturnType<typeof dataArchiveSummary>;
}) {
  return (
    <View style={styles.confirmation} testID="restore-preview">
      <Text accessibilityRole="header" style={styles.confirmationTitle}>
        <fbt desc="Restore backup preview heading">Replace this device's data?</fbt>
      </Text>
      <View style={styles.archiveFacts}>
        <View style={styles.archiveFact}>
          <Text style={styles.archiveFactLabel}><fbt desc="Backup preview moment count label">Moments</fbt></Text>
          <Text style={styles.archiveFactValue}>{summary.checkInCount}</Text>
        </View>
        <View style={styles.archiveFact}>
          <Text style={styles.archiveFactLabel}><fbt desc="Backup preview belief count label">Saved beliefs</fbt></Text>
          <Text style={styles.archiveFactValue}>{summary.beliefStatementCount}</Text>
        </View>
        <View style={styles.archiveFact}>
          <Text style={styles.archiveFactLabel}><fbt desc="Backup preview date label">Created</fbt></Text>
          <Text style={styles.archiveFactValue}>{formatHistoryDate({ date: new Date(summary.exportedAt), locale })}</Text>
        </View>
      </View>
      <Text style={styles.confirmationCopy}>
        <fbt desc="Restore backup validation explanation">The current data is replaced only after the whole backup validates.</fbt>
      </Text>
      <View style={styles.confirmationActions}>
        <Pressable accessibilityRole="button" onPress={onCancel} style={styles.secondaryButton} testID="cancel-data-restore">
          <Text style={styles.secondaryButtonText}><fbt desc="Cancel data restore button">Cancel</fbt></Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onConfirm} style={styles.primaryButton} testID="confirm-data-restore">
          <Text style={styles.primaryButtonText}><fbt desc="Confirm replacing data from a backup">Replace data</fbt></Text>
        </Pressable>
      </View>
    </View>
  );
}

function DeleteConfirmationCard({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <View style={styles.confirmation} testID="delete-all-confirmation">
      <Text accessibilityRole="alert" style={styles.confirmationTitle}>
        <fbt desc="Delete all journal data confirmation heading">Delete every moment?</fbt>
      </Text>
      <Text style={styles.confirmationCopy}>
        <fbt desc="Delete all journal data confirmation explanation">This cannot be undone unless you exported a backup first. Language and display preferences remain.</fbt>
      </Text>
      <View style={styles.confirmationActions}>
        <Pressable accessibilityRole="button" onPress={onCancel} style={styles.secondaryButton} testID="cancel-delete-all">
          <Text style={styles.secondaryButtonText}><fbt desc="Cancel delete all data button">Cancel</fbt></Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onConfirm} style={styles.destructiveButton} testID="confirm-delete-all">
          <Text style={styles.primaryButtonText}><fbt desc="Confirm delete all journal data button">Delete moments</fbt></Text>
        </Pressable>
      </View>
    </View>
  );
}

function DataSafetyMessage({
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
      <Text style={styles.noticeText}>{message}</Text>
    </Pressable>
  );
}

export function DataSafetyControls({ locale }: { locale: string }) {
  const actor = useAppNavigationActor();
  const view = useSelector(actor, _selectDataSafetyView);
  const summary = view.archive ? dataArchiveSummary(view.archive) : null;
  const _export = () => actor.send({ type: DATA_SAFETY_EVENTS.EXPORT_REQUESTED });
  const _restore = () => actor.send({ type: DATA_SAFETY_EVENTS.RESTORE_REQUESTED });
  const _confirmRestore = () => actor.send({ type: DATA_SAFETY_EVENTS.RESTORE_CONFIRMED });
  const _cancelRestore = () => actor.send({ type: DATA_SAFETY_EVENTS.RESTORE_CANCELLED });
  const _delete = () => actor.send({ type: DATA_SAFETY_EVENTS.DELETE_REQUESTED });
  const _confirmDelete = () => actor.send({ type: DATA_SAFETY_EVENTS.DELETE_CONFIRMED });
  const _cancelDelete = () => actor.send({ type: DATA_SAFETY_EVENTS.DELETE_CANCELLED });
  const _dismissNotice = () => actor.send({ type: DATA_SAFETY_EVENTS.NOTICE_DISMISSED });

  return (
    <View testID="data-safety-controls">
      <View style={styles.actionGroup}>
        <DataAction
          busy={view.exporting}
          description={<Text><fbt desc="Explanation of local backup export">Save a complete copy you control as a JSON file.</fbt></Text>}
          disabled={view.busy}
          onPress={_export}
          testID="export-data-archive"
          title={<Text><fbt desc="Button title for exporting all app data">Export a backup</fbt></Text>}
        />
        <View style={styles.divider} />
        <DataAction
          busy={view.picking || view.restoring}
          description={<Text><fbt desc="Explanation of local backup restore">Preview a Youmotion backup before it replaces this device's data.</fbt></Text>}
          disabled={view.busy}
          onPress={_restore}
          testID="restore-data-archive"
          title={<Text><fbt desc="Button title for restoring app data">Restore from a backup</fbt></Text>}
        />
        <View style={styles.divider} />
        <DataAction
          busy={view.deleting}
          description={<Text><fbt desc="Explanation of delete all journal data action">Remove every moment and personal belief. Preferences stay on this device.</fbt></Text>}
          destructive
          disabled={view.busy}
          onPress={_delete}
          testID="delete-all-journal-data"
          title={<Text><fbt desc="Button title for deleting all journal data">Delete all moments</fbt></Text>}
        />
      </View>

      {view.restorePreview && summary ? <RestorePreviewCard locale={locale} onCancel={_cancelRestore} onConfirm={_confirmRestore} summary={summary} /> : null}
      {view.deleteConfirmation ? <DeleteConfirmationCard onCancel={_cancelDelete} onConfirm={_confirmDelete} /> : null}
      <DataSafetyMessage error={view.error} notice={view.notice} onDismiss={_dismissNotice} />

      <View style={styles.privacyNote}>
        <Text style={styles.privacyTitle}><fbt desc="Local data privacy note heading">Local and under your control</fbt></Text>
        <Text style={styles.privacyCopy}><fbt desc="Local data privacy note">Youmotion has no account and does not upload your journal. A backup leaves the app only when you choose where to save or share it.</fbt></Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actionGroup: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: palette.hairline },
  action: { minHeight: 78, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  actionCopy: { flex: 1 },
  actionTitle: { fontFamily: type.semibold, color: palette.ink, fontSize: 15 },
  destructiveText: { color: '#8A3D35' },
  actionDescription: { fontFamily: type.regular, color: palette.inkMuted, fontSize: 12, lineHeight: 18, marginTop: 3 },
  chevron: { fontFamily: type.regular, color: palette.inkMuted, fontSize: 24, lineHeight: 24 },
  divider: { height: 1, backgroundColor: palette.hairline },
  confirmation: { backgroundColor: palette.paperRaised, borderColor: palette.hairline, borderCurve: 'continuous', borderRadius: 20, borderWidth: 1, marginTop: 14, padding: 18 },
  confirmationTitle: { fontFamily: type.semibold, color: palette.ink, fontSize: 17 },
  confirmationCopy: { fontFamily: type.regular, color: palette.inkMuted, fontSize: 13, lineHeight: 20, marginTop: 7 },
  archiveFacts: { gap: 7, marginTop: 14 },
  archiveFact: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  archiveFactLabel: { fontFamily: type.regular, color: palette.inkMuted, fontSize: 13 },
  archiveFactValue: { flexShrink: 1, fontFamily: type.semibold, color: palette.ink, fontSize: 13, textAlign: 'right' },
  confirmationActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  secondaryButton: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderColor: palette.hairline, borderRadius: 14, borderWidth: 1 },
  secondaryButtonText: { fontFamily: type.semibold, color: palette.ink, fontSize: 14 },
  primaryButton: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.ink, borderRadius: 14 },
  destructiveButton: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: '#8A3D35', borderRadius: 14 },
  primaryButtonText: { fontFamily: type.semibold, color: '#FFFFFF', fontSize: 14 },
  notice: { backgroundColor: '#EDF0EB', borderRadius: 14, marginTop: 14, padding: 14 },
  errorNotice: { backgroundColor: '#F5E8E5' },
  noticeText: { fontFamily: type.medium, color: palette.ink, fontSize: 13, lineHeight: 19 },
  privacyNote: { backgroundColor: '#F2EFEA', borderRadius: 20, borderCurve: 'continuous', marginBottom: 24, marginTop: 16, padding: 18 },
  privacyTitle: { fontFamily: type.semibold, color: palette.ink, fontSize: 14 },
  privacyCopy: { fontFamily: type.regular, color: palette.inkMuted, fontSize: 12, lineHeight: 18, marginTop: 4 },
});
