import { useLocaleContext } from 'fbtee';
import { PressableScale } from 'pressto';
import { startTransition } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { APP_LOCALES } from '@/constants';
import { palette, type } from '@/features/check-in/ui/theme';

export function SettingsScreen() {
  const { locale, localeChangeIsPending, setLocale } = useLocaleContext();
  const _setEnglish = () => startTransition(() => setLocale(APP_LOCALES.ENGLISH));
  const _setGerman = () => startTransition(() => setLocale(APP_LOCALES.GERMAN));

  return (
    <View style={styles.page}>
      <SafeAreaView edges={['top']} style={styles.content}>
        <Text style={styles.eyebrow}><fbt desc="Settings screen eyebrow heading">SETTINGS</fbt></Text>
        <Text style={styles.title}><fbt desc="Settings screen title">A protected space.</fbt></Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}><fbt desc="Language setting title">Language</fbt></Text>
          <Text style={styles.cardCopy}><fbt desc="Language setting explanation">Choose the language used throughout Youmotion.</fbt></Text>
          <View style={styles.languageRow}>
            <PressableScale
              accessibilityRole="button"
              accessibilityState={{ selected: locale === APP_LOCALES.ENGLISH }}
              disabled={localeChangeIsPending}
              onPress={_setEnglish}
              style={[styles.languageButton, locale === APP_LOCALES.ENGLISH && styles.languageButtonSelected]}>
              <Text style={[styles.languageText, locale === APP_LOCALES.ENGLISH && styles.languageTextSelected]}><fbt desc="English language option">English</fbt></Text>
            </PressableScale>
            <PressableScale
              accessibilityRole="button"
              accessibilityState={{ selected: locale === APP_LOCALES.GERMAN }}
              disabled={localeChangeIsPending}
              onPress={_setGerman}
              style={[styles.languageButton, locale === APP_LOCALES.GERMAN && styles.languageButtonSelected]}>
              <Text style={[styles.languageText, locale === APP_LOCALES.GERMAN && styles.languageTextSelected]}><fbt desc="German language option">German</fbt></Text>
            </PressableScale>
          </View>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}><fbt desc="Local privacy setting title">Private by design</fbt></Text>
          <Text style={styles.cardCopy}><fbt desc="Local privacy explanation">Your check-ins are currently stored exclusively on this device.</fbt></Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}><fbt desc="About the emotion star setting title">About the emotion star</fbt></Text>
          <Text style={styles.cardCopy}><fbt desc="Explanation of the emotion star source and purpose">The seven basic directions are based on the German therapeutic material “Der Gefühlsstern.” The app supports self-reflection, not diagnosis.</fbt></Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.paper },
  content: { flex: 1, width: '100%', maxWidth: 520, alignSelf: 'center', padding: 22 },
  eyebrow: { fontFamily: type.semibold, color: palette.inkMuted, fontSize: 11, letterSpacing: 1.4, marginTop: 18 },
  title: { fontFamily: type.semibold, color: palette.ink, fontSize: 34, marginTop: 8, marginBottom: 26 },
  card: { backgroundColor: palette.paperRaised, borderRadius: 24, borderWidth: 1, borderColor: palette.hairline, padding: 20, marginBottom: 14 },
  cardTitle: { fontFamily: type.medium, color: palette.ink, fontSize: 20 },
  cardCopy: { fontFamily: type.regular, color: palette.inkMuted, fontSize: 14, lineHeight: 21, marginTop: 7 },
  languageRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  languageButton: { minHeight: 42, flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1, borderColor: palette.hairline },
  languageButtonSelected: { backgroundColor: palette.ink, borderColor: palette.ink },
  languageText: { fontFamily: type.semibold, color: palette.ink, fontSize: 14 },
  languageTextSelected: { color: '#FFFFFF' },
});
