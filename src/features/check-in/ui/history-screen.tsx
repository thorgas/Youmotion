import { useSelector } from '@xstate/store-react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { checkInHistoryStore } from '../application/check-in-history.store';
import { palette, type } from './theme';

const _selectHistory = (state: ReturnType<typeof checkInHistoryStore.getSnapshot>) => state.context.entries;

export function HistoryScreen() {
  const entries = useSelector(checkInHistoryStore, _selectHistory);

  return (
    <View style={styles.page}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.eyebrow}>DEIN VERLAUF</Text>
          <Text style={styles.title}>Momente, die du bemerkt hast.</Text>
          <Text style={styles.intro}>Deine Check-ins bleiben lokal auf diesem Gerät.</Text>
          {entries.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Noch ganz ruhig hier.</Text>
              <Text style={styles.emptyCopy}>Nach deinem ersten Check-in entsteht an dieser Stelle ein behutsamer Verlauf.</Text>
            </View>
          ) : entries.map((entry) => (
            <View key={entry.id} style={styles.row}>
              <View style={styles.dot} />
              <View style={styles.rowCopy}>
                <Text style={styles.emotion}>{entry.emotion} · {entry.nuance}</Text>
                <Text style={styles.date}>{new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(entry.createdAt))}</Text>
                {entry.note ? <Text style={styles.note}>{entry.note}</Text> : null}
              </View>
              <Text style={styles.intensity}>{Math.round(entry.intensity * 100)}%</Text>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.paper },
  safeArea: { flex: 1 },
  content: { width: '100%', maxWidth: 520, alignSelf: 'center', padding: 22, paddingBottom: 40 },
  eyebrow: { fontFamily: type.sansSemibold, color: palette.inkMuted, fontSize: 11, letterSpacing: 1.4, marginTop: 18 },
  title: { fontFamily: type.serifSemibold, color: palette.ink, fontSize: 34, lineHeight: 40, marginTop: 8 },
  intro: { fontFamily: type.sans, color: palette.inkMuted, fontSize: 14, marginTop: 10, marginBottom: 28 },
  empty: { borderRadius: 26, backgroundColor: palette.paperRaised, borderWidth: 1, borderColor: palette.hairline, padding: 26 },
  emptyTitle: { fontFamily: type.serif, color: palette.ink, fontSize: 22 },
  emptyCopy: { fontFamily: type.sans, color: palette.inkMuted, fontSize: 14, lineHeight: 21, marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 17, borderTopWidth: 1, borderColor: palette.hairline },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#8D8278', marginTop: 5, marginRight: 12 },
  rowCopy: { flex: 1 },
  emotion: { fontFamily: type.sansSemibold, color: palette.ink, fontSize: 15 },
  date: { fontFamily: type.sans, color: palette.inkMuted, fontSize: 12, marginTop: 2 },
  note: { fontFamily: type.sans, color: palette.ink, fontSize: 13, lineHeight: 19, marginTop: 8 },
  intensity: { fontFamily: type.sansSemibold, color: palette.inkMuted, fontSize: 13 },
});
