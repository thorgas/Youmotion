import { useSelector } from '@xstate/store-react';
import { PressableScale } from 'pressto';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatHistoryDate } from '@/localization/date-copy';
import { useAppLocale } from '@/localization/app-locale-provider';
import { CHECK_IN_EVENTS } from '@/constants';
import { useAppNavigationActor } from '@/navigation/app-navigation.provider';
import { checkInHistoryStore } from '../application/check-in-history.store';
import type { CheckIn } from '../domain/check-in';
import { emotionSummary } from './emotion-copy';
import { beliefSystemText } from './belief-system-copy';
import {
  confirmCheckInDeletion,
  deleteMomentAccessibilityLabel,
  deleteMomentText,
  editMomentAccessibilityHint,
} from './check-in-deletion';
import { palette, type } from './theme';

const _selectHistory = (state: ReturnType<typeof checkInHistoryStore.getSnapshot>) => state.context;

function MomentRow({ entry, locale }: { entry: CheckIn; locale: string }) {
  const actor = useAppNavigationActor();
  const _edit = () => actor.send({ type: CHECK_IN_EVENTS.EDIT_REQUESTED, entry });
  const _delete = () => actor.send({ type: CHECK_IN_EVENTS.DELETE_REQUESTED, id: entry.id });
  const _confirmDelete = () => confirmCheckInDeletion(_delete);

  return (
    <View style={styles.row}>
      <PressableScale
        accessibilityHint={editMomentAccessibilityHint()}
        accessibilityRole="button"
        onLongPress={_confirmDelete}
        onPress={_edit}
        style={styles.rowMain}
        testID={`history-moment-${entry.id}`}
      >
        <View style={styles.dot} />
        <View style={styles.rowCopy}>
          <Text style={styles.emotion}>{emotionSummary(entry)}</Text>
          <Text style={styles.date}>{formatHistoryDate({ date: new Date(entry.createdAt), locale })}</Text>
          {entry.note ? <Text style={styles.note}>{entry.note}</Text> : null}
          {entry.beliefSystemId ? (
            <Text style={styles.beliefSystem}>{beliefSystemText(entry.beliefSystemId)}</Text>
          ) : null}
        </View>
      </PressableScale>
      <PressableScale
        accessibilityLabel={deleteMomentAccessibilityLabel()}
        accessibilityRole="button"
        onPress={_confirmDelete}
        style={styles.deleteButton}
        testID={`delete-history-moment-${entry.id}`}
      >
        <Text style={styles.deleteText}>{deleteMomentText()}</Text>
      </PressableScale>
    </View>
  );
}

export function HistoryScreen() {
  const history = useSelector(checkInHistoryStore, _selectHistory);
  const locale = useAppLocale();

  return (
    <View style={styles.page} testID="history-screen">
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.eyebrow}><fbt desc="Check-in history eyebrow heading">YOUR HISTORY</fbt></Text>
          <Text style={styles.title}><fbt desc="Check-in history title">Moments you noticed.</fbt></Text>
          <Text style={styles.intro}><fbt desc="Privacy note above check-in history">Your check-ins stay locally on this device.</fbt></Text>
          {history.error ? (
            <Text style={styles.error}>
              <fbt desc="Error shown when check-in history cannot be updated">Your history could not be updated.</fbt>
            </Text>
          ) : null}
          {history.entries.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}><fbt desc="Empty check-in history title">Still quiet here.</fbt></Text>
              <Text style={styles.emptyCopy}><fbt desc="Empty check-in history explanation">After your first check-in, a gentle history will appear here.</fbt></Text>
            </View>
          ) : history.entries.map((entry) => <MomentRow key={entry.id} entry={entry} locale={locale} />)}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.paper },
  safeArea: { flex: 1 },
  content: { width: '100%', maxWidth: 520, alignSelf: 'center', padding: 22, paddingBottom: 40 },
  eyebrow: { fontFamily: type.semibold, color: palette.inkMuted, fontSize: 11, letterSpacing: 1.4, marginTop: 18 },
  title: { fontFamily: type.semibold, color: palette.ink, fontSize: 34, lineHeight: 40, marginTop: 8 },
  intro: { fontFamily: type.regular, color: palette.inkMuted, fontSize: 14, marginTop: 10, marginBottom: 28 },
  empty: { borderRadius: 26, backgroundColor: palette.paperRaised, borderWidth: 1, borderColor: palette.hairline, padding: 26 },
  emptyTitle: { fontFamily: type.medium, color: palette.ink, fontSize: 22 },
  emptyCopy: { fontFamily: type.regular, color: palette.inkMuted, fontSize: 14, lineHeight: 21, marginTop: 8 },
  error: { fontFamily: type.medium, color: palette.danger, fontSize: 12, lineHeight: 18, paddingBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderColor: palette.hairline },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 17, paddingRight: 10 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#8D8278', marginTop: 5, marginRight: 12 },
  rowCopy: { flex: 1 },
  emotion: { fontFamily: type.semibold, color: palette.ink, fontSize: 15 },
  date: { fontFamily: type.regular, color: palette.inkMuted, fontSize: 12, marginTop: 2 },
  note: { fontFamily: type.regular, color: palette.ink, fontSize: 13, lineHeight: 19, marginTop: 8 },
  beliefSystem: { fontFamily: type.medium, color: palette.moss, fontSize: 12, lineHeight: 18, marginTop: 8 },
  deleteButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  deleteText: { fontFamily: type.semibold, color: palette.danger, fontSize: 12 },
});
