import { useLocaleContext } from 'fbtee';
import { useSelector } from '@xstate/store-react';
import { PressableScale } from 'pressto';
import { startTransition } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  APP_LOCALES,
  EMOTION_LABEL_MODES,
  SETTINGS_EVENTS,
} from '@/constants';
import { palette, type } from '@/features/check-in/ui/theme';
import { useAppNavigationActor } from '@/navigation/app-navigation.provider';
import { emotionLabelModeStore } from '../application/emotion-label-mode.store';

const _selectEmotionLabelMode = (state: ReturnType<typeof emotionLabelModeStore.getSnapshot>) => state.context.mode;

export function SettingsScreen() {
  const actor = useAppNavigationActor();
  const { locale, localeChangeIsPending, setLocale } = useLocaleContext();
  const emotionLabelMode = useSelector(emotionLabelModeStore, _selectEmotionLabelMode);
  const _setEnglish = () => startTransition(() => setLocale(APP_LOCALES.ENGLISH));
  const _setGerman = () => startTransition(() => setLocale(APP_LOCALES.GERMAN));
  const _showEmoji = () => actor.send({ type: SETTINGS_EVENTS.EMOTION_LABEL_MODE_CHANGED, mode: EMOTION_LABEL_MODES.EMOJI });
  const _showText = () => actor.send({ type: SETTINGS_EVENTS.EMOTION_LABEL_MODE_CHANGED, mode: EMOTION_LABEL_MODES.TEXT });
  const _showBoth = () => actor.send({ type: SETTINGS_EVENTS.EMOTION_LABEL_MODE_CHANGED, mode: EMOTION_LABEL_MODES.BOTH });

  return (
    <View style={styles.page} testID="settings-screen">
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
              style={[styles.languageButton, locale === APP_LOCALES.ENGLISH && styles.languageButtonSelected]}
              testID="language-english">
              <Text style={[styles.languageText, locale === APP_LOCALES.ENGLISH && styles.languageTextSelected]}><fbt desc="English language option">English</fbt></Text>
            </PressableScale>
            <PressableScale
              accessibilityRole="button"
              accessibilityState={{ selected: locale === APP_LOCALES.GERMAN }}
              disabled={localeChangeIsPending}
              onPress={_setGerman}
              style={[styles.languageButton, locale === APP_LOCALES.GERMAN && styles.languageButtonSelected]}
              testID="language-german">
              <Text style={[styles.languageText, locale === APP_LOCALES.GERMAN && styles.languageTextSelected]}><fbt desc="German language option">German</fbt></Text>
            </PressableScale>
          </View>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}><fbt desc="Emotion star label display setting title">Emotion labels</fbt></Text>
          <Text style={styles.cardCopy}><fbt desc="Explanation of the emotion star label display setting">Choose what appears around the emotion star before you touch it.</fbt></Text>
          <View style={styles.labelModeRow}>
            <PressableScale
              accessibilityRole="button"
              accessibilityState={{ selected: emotionLabelMode === EMOTION_LABEL_MODES.EMOJI }}
              onPress={_showEmoji}
              style={[styles.labelModeButton, emotionLabelMode === EMOTION_LABEL_MODES.EMOJI && styles.languageButtonSelected]}
              testID="emotion-label-mode-emoji">
              <Text style={[styles.labelModeText, emotionLabelMode === EMOTION_LABEL_MODES.EMOJI && styles.languageTextSelected]}><fbt desc="Emoji-only emotion label display option">Emoji</fbt></Text>
            </PressableScale>
            <PressableScale
              accessibilityRole="button"
              accessibilityState={{ selected: emotionLabelMode === EMOTION_LABEL_MODES.TEXT }}
              onPress={_showText}
              style={[styles.labelModeButton, emotionLabelMode === EMOTION_LABEL_MODES.TEXT && styles.languageButtonSelected]}
              testID="emotion-label-mode-text">
              <Text style={[styles.labelModeText, emotionLabelMode === EMOTION_LABEL_MODES.TEXT && styles.languageTextSelected]}><fbt desc="Text-only emotion label display option">Text</fbt></Text>
            </PressableScale>
            <PressableScale
              accessibilityRole="button"
              accessibilityState={{ selected: emotionLabelMode === EMOTION_LABEL_MODES.BOTH }}
              onPress={_showBoth}
              style={[styles.labelModeButton, emotionLabelMode === EMOTION_LABEL_MODES.BOTH && styles.languageButtonSelected]}
              testID="emotion-label-mode-both">
              <Text style={[styles.labelModeText, emotionLabelMode === EMOTION_LABEL_MODES.BOTH && styles.languageTextSelected]}><fbt desc="Emoji and text emotion label display option">Both</fbt></Text>
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
  title: { fontFamily: type.semibold, color: palette.ink, fontSize: 34, marginTop: 8, marginBottom: 26 },
  card: { backgroundColor: palette.paperRaised, borderRadius: 24, borderWidth: 1, borderColor: palette.hairline, padding: 20, marginBottom: 14 },
  cardTitle: { fontFamily: type.medium, color: palette.ink, fontSize: 20 },
  cardCopy: { fontFamily: type.regular, color: palette.inkMuted, fontSize: 14, lineHeight: 21, marginTop: 7 },
  languageRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  languageButton: { minHeight: 42, flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1, borderColor: palette.hairline },
  languageButtonSelected: { backgroundColor: palette.ink, borderColor: palette.ink },
  languageText: { fontFamily: type.semibold, color: palette.ink, fontSize: 14 },
  languageTextSelected: { color: '#FFFFFF' },
  labelModeRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  labelModeButton: { minHeight: 42, flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1, borderColor: palette.hairline, paddingHorizontal: 8 },
  labelModeText: { fontFamily: type.semibold, color: palette.ink, fontSize: 13 },
});
