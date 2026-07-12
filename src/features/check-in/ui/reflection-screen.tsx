import { useSelector } from '@xstate/react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CHECK_IN_EVENTS, CHECK_IN_STATES, NAVIGATION_STATES } from '@/constants';
import { useAppNavigationActor } from '@/navigation/app-navigation.provider';
import { palette, type } from './theme';

const _selectSnapshot = (snapshot: ReturnType<ReturnType<typeof useAppNavigationActor>['getSnapshot']>) => snapshot;

export function ReflectionScreen() {
  const actor = useAppNavigationActor();
  const snapshot = useSelector(actor, _selectSnapshot);
  const selection = snapshot.context.selection;
  const { error } = snapshot.context;
  const saving = snapshot.matches(CHECK_IN_STATES.SAVING);
  const failed = snapshot.matches(CHECK_IN_STATES.FAILURE);

  const _noteChanged = (note: string) => actor.send({ type: CHECK_IN_EVENTS.NOTE_CHANGED, note });
  const _back = () => actor.send({ type: CHECK_IN_EVENTS.REFLECTION_CANCELLED });
  const _submit = () => actor.send({ type: failed ? CHECK_IN_EVENTS.RETRIED : CHECK_IN_EVENTS.CONFIRMED });

  if (!selection || snapshot.matches(NAVIGATION_STATES.TABS)) return null;

  return (
    <View style={styles.page}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>02 · REFLEKTIEREN</Text>
          <Text style={styles.title}>Was ist gerade da?</Text>
          <Text style={styles.copy}>Du musst nichts erklären. Ein paar Worte können helfen, den Moment festzuhalten.</Text>
        </View>
        <View style={styles.card}>
          <View style={styles.selectionRow}>
            <View style={[styles.dot, { backgroundColor: selection.color }]} />
            <View>
              <Text style={styles.emotion}>{selection.emotion}</Text>
              <Text style={styles.nuance}>{selection.nuance} · {Math.round(selection.intensity * 100)}%</Text>
            </View>
          </View>
          <TextInput
            accessibilityLabel="Optionale Notiz zum Gefühl"
            editable={!saving}
            maxLength={240}
            multiline
            onChangeText={_noteChanged}
            placeholder="Ein Gedanke, ein Körpergefühl, eine Situation …"
            placeholderTextColor="#A39A8F"
            style={styles.input}
            value={snapshot.context.note}
          />
          {failed ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" disabled={saving} onPress={_back} style={styles.secondaryButton}>
              <Text style={styles.secondaryText}>Zurück</Text>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={saving} onPress={_submit} style={styles.primaryButton}>
              {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>{failed ? 'Erneut versuchen' : 'Check-in speichern'}</Text>}
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.paper },
  safeArea: { flex: 1, width: '100%', maxWidth: 520, alignSelf: 'center', padding: 22 },
  header: { marginTop: 24 },
  eyebrow: { fontFamily: type.sansSemibold, color: palette.inkMuted, fontSize: 11, letterSpacing: 1.4 },
  title: { fontFamily: type.serifSemibold, color: palette.ink, fontSize: 34, marginTop: 8 },
  copy: { fontFamily: type.sans, color: palette.inkMuted, fontSize: 15, lineHeight: 22, marginTop: 10 },
  card: { marginTop: 28, padding: 20, borderRadius: 26, backgroundColor: palette.paperRaised, borderWidth: 1, borderColor: palette.hairline },
  selectionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  dot: { width: 14, height: 14, borderRadius: 7, marginRight: 12 },
  emotion: { fontFamily: type.sansSemibold, color: palette.ink, fontSize: 16 },
  nuance: { fontFamily: type.sans, color: palette.inkMuted, fontSize: 13 },
  input: { minHeight: 150, borderRadius: 18, backgroundColor: '#F0EAE0', padding: 16, fontFamily: type.sans, color: palette.ink, fontSize: 15, lineHeight: 22, textAlignVertical: 'top' },
  error: { fontFamily: type.sansMedium, color: palette.danger, fontSize: 12, marginTop: 10 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  primaryButton: { minHeight: 50, flex: 1, backgroundColor: palette.ink, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  primaryText: { fontFamily: type.sansSemibold, color: '#FFFFFF', fontSize: 14 },
  secondaryButton: { minHeight: 50, paddingHorizontal: 20, borderRadius: 16, borderWidth: 1, borderColor: palette.hairline, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontFamily: type.sansSemibold, color: palette.ink, fontSize: 14 },
});
