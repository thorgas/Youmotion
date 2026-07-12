import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { palette, type } from '@/features/check-in/ui/theme';

export function SettingsScreen() {
  return (
    <View style={styles.page}>
      <SafeAreaView edges={['top']} style={styles.content}>
        <Text style={styles.eyebrow}>EINSTELLUNGEN</Text>
        <Text style={styles.title}>Ein geschützter Raum.</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Privat by design</Text>
          <Text style={styles.cardCopy}>Deine Check-ins werden derzeit ausschließlich lokal auf diesem Gerät gespeichert.</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Über den Gefühlsstern</Text>
          <Text style={styles.cardCopy}>Die sieben Grundrichtungen basieren auf dem deutschen Therapiematerial „Der Gefühlsstern“. Die App dient der Selbstreflexion, nicht der Diagnose.</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.paper },
  content: { flex: 1, width: '100%', maxWidth: 520, alignSelf: 'center', padding: 22 },
  eyebrow: { fontFamily: type.sansSemibold, color: palette.inkMuted, fontSize: 11, letterSpacing: 1.4, marginTop: 18 },
  title: { fontFamily: type.serifSemibold, color: palette.ink, fontSize: 34, marginTop: 8, marginBottom: 26 },
  card: { backgroundColor: palette.paperRaised, borderRadius: 24, borderWidth: 1, borderColor: palette.hairline, padding: 20, marginBottom: 14 },
  cardTitle: { fontFamily: type.serif, color: palette.ink, fontSize: 20 },
  cardCopy: { fontFamily: type.sans, color: palette.inkMuted, fontSize: 14, lineHeight: 21, marginTop: 7 },
});
