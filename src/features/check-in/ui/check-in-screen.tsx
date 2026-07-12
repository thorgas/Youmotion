import { useSelector as useActorSelector } from '@xstate/react';
import { useSelector as useStoreSelector } from '@xstate/store-react';
import { useLocaleContext } from 'fbtee';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CHECK_IN_EVENTS } from '@/constants';
import { formatHeadlineDate } from '@/localization/date-copy';
import { useAppNavigationActor } from '@/navigation/app-navigation.provider';
import type { EmotionSelection } from '../domain/check-in';
import { checkInHistoryStore } from '../application/check-in-history.store';
import { EmotionStar } from './emotion-star';
import { emotionSummary, intensityCopy } from './emotion-copy';
import { palette, type } from './theme';

const _selectSnapshot = (snapshot: ReturnType<ReturnType<typeof useAppNavigationActor>['getSnapshot']>) => snapshot;
const _selectHistory = (state: ReturnType<typeof checkInHistoryStore.getSnapshot>) => state.context.entries;

export function CheckInScreen() {
  const actor = useAppNavigationActor();
  const snapshot = useActorSelector(actor, _selectSnapshot);
  const entries = useStoreSelector(checkInHistoryStore, _selectHistory);
  const { locale } = useLocaleContext();
  const latest = entries[0];

  const _touchStarted = () => actor.send({ type: CHECK_IN_EVENTS.TOUCH_STARTED });
  const _selectionChanged = (selection: EmotionSelection | null) => {
    actor.send({ type: CHECK_IN_EVENTS.SELECTION_CHANGED, selection });
  };
  const _selectionReleased = () => actor.send({ type: CHECK_IN_EVENTS.SELECTION_RELEASED });

  return (
    <View style={styles.page}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>{formatHeadlineDate({ date: new Date(), locale })}</Text>
              <Text style={styles.title}><fbt desc="Question asking the user about their current feeling">How are you feeling?</fbt></Text>
            </View>
            <View accessibilityLabel="Youmotion" style={styles.mark}>
              <Text style={styles.markText}>Y</Text>
            </View>
          </View>
          <Text style={styles.intro}>
            <fbt desc="Instructions introducing the emotion star gesture">Take a moment. Drag from the center in the direction that feels most fitting right now.</fbt>
          </Text>
          <View style={styles.starCard}>
            <View style={styles.cardTopline}>
              <Text style={styles.cardLabel}><fbt desc="Emotion star card label">EMOTION STAR</fbt></Text>
              <Text style={styles.cardStep}><fbt desc="First step label for exploring emotions">01 · Explore</fbt></Text>
            </View>
            <EmotionStar
              selection={snapshot.context.selection}
              onTouchStart={_touchStarted}
              onSelectionChange={_selectionChanged}
              onRelease={_selectionReleased}
            />
          </View>
          <View style={styles.gestureHint}>
            <View style={styles.hintLine} />
            <Text style={styles.hintText}><fbt desc="Short gesture instructions">HOLD · DRAG · RELEASE</fbt></Text>
            <View style={styles.hintLine} />
          </View>
          {latest ? (
            <View style={styles.recent}>
              <Text style={styles.sectionTitle}><fbt desc="Heading for the most recent check-in">Latest check-in</fbt></Text>
              <View style={styles.recentCard}>
                <View style={styles.recentDot} />
                <View style={styles.recentCopy}>
                  <Text style={styles.recentEmotion}>{emotionSummary(latest)}</Text>
                  <Text style={styles.recentTime}>{intensityCopy(latest.intensity)}</Text>
                </View>
              </View>
            </View>
          ) : null}
          <Text style={styles.disclaimer}>
            <fbt desc="Health disclaimer shown below the emotion check-in">Youmotion supports self-awareness and does not replace psychotherapeutic or medical treatment.</fbt>
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.paper },
  safeArea: { flex: 1 },
  content: { width: '100%', maxWidth: 520, alignSelf: 'center', paddingHorizontal: 20, paddingBottom: 36 },
  header: { marginTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { fontFamily: type.sansMedium, color: palette.inkMuted, fontSize: 12, letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 5 },
  title: { fontFamily: type.serifSemibold, color: palette.ink, fontSize: 34, lineHeight: 40, letterSpacing: -0.8 },
  mark: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: palette.hairline, backgroundColor: palette.whiteWash, alignItems: 'center', justifyContent: 'center' },
  markText: { fontFamily: type.serifSemibold, color: palette.ink, fontSize: 20 },
  intro: { fontFamily: type.sans, color: palette.inkMuted, fontSize: 15, lineHeight: 22, marginTop: 16, marginBottom: 18, maxWidth: 410 },
  starCard: { backgroundColor: palette.paperRaised, borderRadius: 30, borderWidth: 1, borderColor: palette.hairline, paddingHorizontal: 14, paddingTop: 18, paddingBottom: 14, shadowColor: '#463B31', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.08, shadowRadius: 28, elevation: 4, overflow: 'hidden' },
  cardTopline: { paddingHorizontal: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLabel: { fontFamily: type.sansSemibold, color: palette.ink, fontSize: 11, letterSpacing: 1.4 },
  cardStep: { fontFamily: type.sansMedium, color: palette.inkMuted, fontSize: 11 },
  gestureHint: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 8, marginTop: 17 },
  hintLine: { height: 1, backgroundColor: palette.hairline, flex: 1 },
  hintText: { fontFamily: type.sansSemibold, color: palette.inkMuted, fontSize: 10, letterSpacing: 1.2 },
  recent: { marginTop: 28 },
  sectionTitle: { fontFamily: type.serif, color: palette.ink, fontSize: 20, marginBottom: 10 },
  recentCard: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderBottomWidth: 1, borderColor: palette.hairline, paddingVertical: 14 },
  recentDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12, backgroundColor: '#8D8278' },
  recentCopy: { flex: 1 },
  recentEmotion: { fontFamily: type.sansMedium, color: palette.ink, fontSize: 14 },
  recentTime: { fontFamily: type.sans, color: palette.inkMuted, fontSize: 12, marginTop: 2 },
  disclaimer: { fontFamily: type.sans, color: '#918A80', fontSize: 11, lineHeight: 16, marginTop: 26, textAlign: 'center', paddingHorizontal: 12 },
});
