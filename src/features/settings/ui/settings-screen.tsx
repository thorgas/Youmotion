import { useSelector as useActorSelector } from '@xstate/react';
import { useSelector } from '@xstate/store-react';
import { fbs } from 'fbtee';
import { PressableScale } from 'pressto';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  APP_LOCALES,
  BELIEF_LIBRARY_EVENTS,
  EMOTION_LABEL_MODES,
  MOTION_DURATION,
  ONBOARDING_EVENTS,
  SETTINGS_EVENTS,
} from '@/constants';
import {
  tabScreenContentStyle,
  tabScreenEyebrowStyle,
  tabScreenTitleStyle,
} from '@/components/ui/tab-screen-layout';
import { activeCustomBeliefStatements } from '@/features/check-in/domain/belief-statement';
import { palette, type } from '@/features/check-in/ui/theme';
import { useAppNavigationActor } from '@/navigation/app-navigation.provider';
import { appSettingsStore } from '../application/app-settings.store';

const _selectSettings = (state: ReturnType<typeof appSettingsStore.getSnapshot>) => state.context;
const _selectBeliefStatements = (
  snapshot: ReturnType<ReturnType<typeof useAppNavigationActor>['getSnapshot']>,
) => snapshot.context.beliefStatements;
const selectionAnimation = {
  duration: MOTION_DURATION.STATE,
  reduceMotion: ReduceMotion.System,
};

function PreferenceOption({
  label,
  onPress,
  selected,
  style,
  testID,
  textStyle,
}: {
  label: string;
  onPress: () => void;
  selected: boolean;
  style: StyleProp<ViewStyle>;
  testID: string;
  textStyle: StyleProp<TextStyle>;
}) {
  const selectionStyle = useAnimatedStyle(() => ({
    opacity: withTiming(selected ? 1 : 0, selectionAnimation),
    transform: [{
      scale: withTiming(selected ? 1 : 0.96, selectionAnimation),
    }],
  }), [selected]);
  const selectionTextStyle = useAnimatedStyle(() => ({
    color: withTiming(selected ? '#FFFFFF' : palette.ink, selectionAnimation),
  }), [selected]);

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={style}
      testID={testID}>
      <Animated.View
        pointerEvents="none"
        style={[styles.preferenceSelection, selectionStyle]}
      />
      <Animated.Text style={[textStyle, selectionTextStyle]}>
        {label}
      </Animated.Text>
    </PressableScale>
  );
}

function AppReleaseInfoCard({
  appVersion,
  updateChannel,
  gitCommit,
}: {
  appVersion: string | null;
  updateChannel: string | null;
  gitCommit: string | null;
}) {
  const shortGitCommit = gitCommit?.slice(0, 7);

  return (
    <View style={styles.releaseFooter} testID="app-release-info">
      <Text style={styles.sectionHeading}><fbt desc="App release information title">App information</fbt></Text>
      <View style={styles.releaseInfo}>
        <View style={styles.releaseInfoRow}>
          <Text style={styles.releaseInfoLabel}><fbt desc="App version information label">App</fbt></Text>
          <Text selectable style={styles.releaseInfoValue}>{appVersion ?? <fbt desc="Unavailable app version value">Not available</fbt>}</Text>
        </View>
        <View style={styles.releaseInfoRow}>
          <Text style={styles.releaseInfoLabel}><fbt desc="EAS Update channel information label">Channel</fbt></Text>
          <Text selectable style={styles.releaseInfoValue}>{updateChannel ?? <fbt desc="Unavailable EAS Update channel value">Not available</fbt>}</Text>
        </View>
        <View style={styles.releaseInfoRow}>
          <Text style={styles.releaseInfoLabel}><fbt desc="Git commit information label">Git</fbt></Text>
          <Text selectable style={styles.releaseInfoValue}>{shortGitCommit ?? <fbt desc="Unavailable Git commit value">Not available</fbt>}</Text>
        </View>
      </View>
    </View>
  );
}

function SettingsActionRow({
  count,
  description,
  onPress,
  testID,
  title,
}: {
  count?: number;
  description: string;
  onPress: () => void;
  testID: string;
  title: string;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      onPress={onPress}
      style={styles.actionRow}
      testID={testID}
    >
      <View style={styles.actionCopy}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionDescription}>{description}</Text>
      </View>
      {count === undefined ? null : <Text style={styles.actionCount}>{count}</Text>}
      <Text accessibilityElementsHidden style={styles.actionChevron}>›</Text>
    </PressableScale>
  );
}

export function SettingsScreen() {
  const actor = useAppNavigationActor();
  const {
    locale,
    emotionLabelMode,
    appVersion,
    updateChannel,
    gitCommit,
  } = useSelector(appSettingsStore, _selectSettings);
  const beliefStatements = useActorSelector(actor, _selectBeliefStatements);
  const personalBeliefCount = activeCustomBeliefStatements(beliefStatements).length;
  const _setEnglish = () => actor.send({
    type: SETTINGS_EVENTS.LANGUAGE_CHANGED,
    locale: APP_LOCALES.ENGLISH,
  });
  const _setGerman = () => actor.send({
    type: SETTINGS_EVENTS.LANGUAGE_CHANGED,
    locale: APP_LOCALES.GERMAN,
  });
  const _showEmoji = () => actor.send({ type: SETTINGS_EVENTS.EMOTION_LABEL_MODE_CHANGED, mode: EMOTION_LABEL_MODES.EMOJI });
  const _showText = () => actor.send({ type: SETTINGS_EVENTS.EMOTION_LABEL_MODE_CHANGED, mode: EMOTION_LABEL_MODES.TEXT });
  const _showBoth = () => actor.send({ type: SETTINGS_EVENTS.EMOTION_LABEL_MODE_CHANGED, mode: EMOTION_LABEL_MODES.BOTH });
  const _openOnboarding = () => actor.send({ type: ONBOARDING_EVENTS.OPENED });
  const _openBeliefLibrary = () => actor.send({ type: BELIEF_LIBRARY_EVENTS.OPENED });

  return (
    <View style={styles.page} testID="settings-screen">
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow} testID="settings-eyebrow"><fbt desc="Settings screen eyebrow heading">SETTINGS</fbt></Text>
        <Text style={styles.title}><fbt desc="Settings screen title">Your space.</fbt></Text>
        <Text style={styles.sectionHeading}>
          <fbt desc="Heading grouping app preferences in settings">PREFERENCES</fbt>
        </Text>
        <View style={styles.preferencesCard}>
          <View style={styles.preferenceGroup}>
          <Text style={styles.cardTitle}><fbt desc="Language setting title">Language</fbt></Text>
          <Text style={styles.cardCopy}><fbt desc="Language setting explanation">Choose the language used throughout Youmotion.</fbt></Text>
          <View style={styles.languageRow}>
            <PreferenceOption
              label={String(fbs('English', 'English language option'))}
              onPress={_setEnglish}
              selected={locale === APP_LOCALES.ENGLISH}
              style={styles.languageButton}
              testID="language-english"
              textStyle={styles.languageText}
            />
            <PreferenceOption
              label={String(fbs('German', 'German language option'))}
              onPress={_setGerman}
              selected={locale === APP_LOCALES.GERMAN}
              style={styles.languageButton}
              testID="language-german"
              textStyle={styles.languageText}
            />
          </View>
          </View>
          <View style={styles.preferenceDivider} />
          <View style={styles.preferenceGroup}>
          <Text style={styles.cardTitle}><fbt desc="Emotion star label display setting title">Emotion labels</fbt></Text>
          <Text style={styles.cardCopy}><fbt desc="Explanation of the emotion star label display setting">Choose what appears around the emotion star before you touch it.</fbt></Text>
          <View style={styles.labelModeRow}>
            <PreferenceOption
              label={String(fbs('Emoji', 'Emoji-only emotion label display option'))}
              onPress={_showEmoji}
              selected={emotionLabelMode === EMOTION_LABEL_MODES.EMOJI}
              style={styles.labelModeButton}
              testID="emotion-label-mode-emoji"
              textStyle={styles.labelModeText}
            />
            <PreferenceOption
              label={String(fbs('Text', 'Text-only emotion label display option'))}
              onPress={_showText}
              selected={emotionLabelMode === EMOTION_LABEL_MODES.TEXT}
              style={styles.labelModeButton}
              testID="emotion-label-mode-text"
              textStyle={styles.labelModeText}
            />
            <PreferenceOption
              label={String(fbs('Both', 'Emoji and text emotion label display option'))}
              onPress={_showBoth}
              selected={emotionLabelMode === EMOTION_LABEL_MODES.BOTH}
              style={styles.labelModeButton}
              testID="emotion-label-mode-both"
              textStyle={styles.labelModeText}
            />
          </View>
          </View>
        </View>
        <Text style={styles.sectionHeading}>
          <fbt desc="Heading for the Settings onboarding replay action">UNDERSTAND YOUMOTION</fbt>
        </Text>
        <View style={styles.actionGroup}>
          <SettingsActionRow
            description={String(fbs(
              'Replay the short guide to the Pulse, reflection, and optional beliefs.',
              'Settings explanation of the onboarding replay action',
            ))}
            onPress={_openOnboarding}
            testID="open-onboarding"
            title={String(fbs(
              'Open short guide',
              'Settings button that replays the explanation onboarding',
            ))}
          />
        </View>
        <Text style={styles.sectionHeading}>
          <fbt desc="Heading grouping personalization links in settings">PERSONALIZE</fbt>
        </Text>
        <View style={styles.actionGroup}>
          <SettingsActionRow
            count={personalBeliefCount}
            description={String(fbs(
              'Edit or remove the core beliefs you wrote yourself.',
              'Personal core-belief management setting explanation',
            ))}
            onPress={_openBeliefLibrary}
            testID="open-belief-library"
            title={String(fbs(
              'Manage personal core beliefs',
              'Button opening personal core-belief management',
            ))}
          />
        </View>
        <Text style={styles.sectionHeading}>
          <fbt desc="Heading grouping data and product information in settings">YOUR DATA</fbt>
        </Text>
        <View style={styles.infoGroup}>
          <View style={styles.infoRow}>
            <Text style={styles.infoTitle}><fbt desc="Local privacy setting title">Private by design</fbt></Text>
            <Text style={styles.infoCopy}><fbt desc="Local privacy explanation">Your check-ins are currently stored exclusively on this device.</fbt></Text>
          </View>
          <View style={styles.actionDivider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoTitle}><fbt desc="About the emotion star setting title">About the emotion star</fbt></Text>
            <Text style={styles.infoCopy}><fbt desc="Explanation of the emotion star source and purpose">The seven basic directions are based on the German therapeutic material “Der Gefühlsstern.” The app supports self-reflection, not diagnosis.</fbt></Text>
          </View>
        </View>
        <AppReleaseInfoCard
          appVersion={appVersion}
          gitCommit={gitCommit}
          updateChannel={updateChannel}
        />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.paper },
  safeArea: { flex: 1 },
  content: tabScreenContentStyle,
  eyebrow: tabScreenEyebrowStyle,
  title: {
    ...tabScreenTitleStyle,
    marginBottom: 30,
  },
  sectionHeading: {
    fontFamily: type.semibold,
    color: palette.inkMuted,
    fontSize: 10,
    letterSpacing: 1.3,
    marginBottom: 10,
    marginTop: 8,
    textTransform: 'uppercase',
  },
  preferencesCard: {
    backgroundColor: palette.paperRaised,
    borderRadius: 24,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: palette.hairline,
    marginBottom: 26,
    overflow: 'hidden',
  },
  preferenceGroup: { padding: 18 },
  preferenceDivider: { height: 1, backgroundColor: palette.hairline, marginHorizontal: 18 },
  cardTitle: { fontFamily: type.medium, color: palette.ink, fontSize: 18 },
  cardCopy: { fontFamily: type.regular, color: palette.inkMuted, fontSize: 14, lineHeight: 21, marginTop: 7 },
  languageRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  languageButton: { minHeight: 42, flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1, borderColor: palette.hairline, overflow: 'hidden' },
  languageText: { fontFamily: type.semibold, color: palette.ink, fontSize: 14 },
  labelModeRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  labelModeButton: { minHeight: 42, flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1, borderColor: palette.hairline, paddingHorizontal: 8, overflow: 'hidden' },
  labelModeText: { fontFamily: type.semibold, color: palette.ink, fontSize: 13 },
  preferenceSelection: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: palette.ink,
  },
  actionGroup: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: palette.hairline,
    marginBottom: 26,
  },
  actionRow: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  actionCopy: { flex: 1 },
  actionTitle: { fontFamily: type.semibold, color: palette.ink, fontSize: 15 },
  actionDescription: {
    fontFamily: type.regular,
    color: palette.inkMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  actionDivider: { height: 1, backgroundColor: palette.hairline },
  actionCount: {
    minWidth: 28,
    minHeight: 28,
    borderRadius: 14,
    backgroundColor: '#EDF0EB',
    fontFamily: type.semibold,
    color: palette.moss,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 28,
  },
  actionChevron: {
    fontFamily: type.regular,
    color: palette.inkMuted,
    fontSize: 24,
    lineHeight: 24,
  },
  infoGroup: {
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: '#F2EFEA',
    paddingHorizontal: 18,
    marginBottom: 24,
  },
  infoRow: { paddingVertical: 16 },
  infoTitle: { fontFamily: type.semibold, color: palette.ink, fontSize: 14 },
  infoCopy: {
    fontFamily: type.regular,
    color: palette.inkMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  releaseFooter: { paddingHorizontal: 2, paddingBottom: 8 },
  releaseInfo: { marginTop: 12 },
  releaseInfoRow: { minHeight: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  releaseInfoLabel: { fontFamily: type.regular, color: palette.inkMuted, fontSize: 14 },
  releaseInfoValue: { flexShrink: 1, fontFamily: type.semibold, color: palette.ink, fontSize: 14, textAlign: 'right' },
});
