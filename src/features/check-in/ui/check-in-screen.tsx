import { useSelector as useActorSelector } from '@xstate/react';
import { useSelector as useStoreSelector } from '@xstate/store-react';
import { PressableScale } from 'pressto';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CHECK_IN_EVENTS } from '@/constants';
import { useAppNavigationActor } from '@/navigation/app-navigation.provider';
import type { EmotionSelection } from '../domain/check-in';
import { checkInHistoryStore } from '../application/check-in-history.store';
import { EmotionStar } from './emotion-star';
import { emotionSummary } from './emotion-copy';
import { palette, type } from './theme';

const _selectSnapshot = (snapshot: ReturnType<ReturnType<typeof useAppNavigationActor>['getSnapshot']>) => snapshot;
const _selectHistory = (state: ReturnType<typeof checkInHistoryStore.getSnapshot>) => state.context.entries;

export function CheckInScreen() {
  const actor = useAppNavigationActor();
  const snapshot = useActorSelector(actor, _selectSnapshot);
  const entries = useStoreSelector(checkInHistoryStore, _selectHistory);
  const latest = entries[0];
  const editing = snapshot.context.editing !== null;

  const _touchStarted = () => actor.send({ type: CHECK_IN_EVENTS.TOUCH_STARTED });
  const _selectionChanged = (selection: EmotionSelection | null) => {
    actor.send({ type: CHECK_IN_EVENTS.SELECTION_CHANGED, selection });
  };
  const _selectionCancelled = () => actor.send({ type: CHECK_IN_EVENTS.SELECTION_CANCELLED });
  const _selectionReleased = () => actor.send({ type: CHECK_IN_EVENTS.SELECTION_RELEASED });
  const _editLatest = () => {
    if (latest) actor.send({ type: CHECK_IN_EVENTS.EDIT_REQUESTED, entry: latest });
  };

  return (
    <View style={styles.page}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {editing
                ? <fbt desc="Question shown while changing the feeling in an existing check-in">How did you feel then?</fbt>
                : <fbt desc="Question asking the user about their current feeling">How are you feeling right now?</fbt>}
            </Text>
          </View>
          <View style={styles.starStage}>
            <EmotionStar
              selection={snapshot.context.selection}
              onCancel={_selectionCancelled}
              onTouchStart={_touchStarted}
              onSelectionChange={_selectionChanged}
              onRelease={_selectionReleased}
            />
          </View>
          {latest && !editing ? (
            <View style={styles.recent}>
              <Text style={styles.sectionTitle}><fbt desc="Heading for the most recent check-in">Latest check-in</fbt></Text>
              <PressableScale accessibilityRole="button" onPress={_editLatest} style={styles.recentCard}>
                <View style={styles.recentDot} />
                <View style={styles.recentCopy}>
                  <Text style={styles.recentEmotion}>{emotionSummary(latest)}</Text>
                </View>
              </PressableScale>
            </View>
          ) : null}
          <Text style={styles.disclaimer}>
            <fbt desc="Health disclaimer shown below the emotion check-in">Youmotion supports self-awareness and does not replace psychotherapeutic or medical treatment.</fbt>
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.paper },
  safeArea: { flex: 1 },
  content: { width: '100%', maxWidth: 520, minHeight: '100%', alignSelf: 'center', paddingHorizontal: 16, paddingBottom: 32 },
  header: { marginTop: 34, alignItems: 'center', paddingHorizontal: 32 },
  title: { fontFamily: type.semibold, color: palette.ink, fontSize: 30, lineHeight: 36, letterSpacing: -0.5, textAlign: 'center', opacity: 0.9 },
  starStage: { marginTop: 24, alignItems: 'center' },
  recent: { marginTop: 28 },
  sectionTitle: { fontFamily: type.medium, color: palette.ink, fontSize: 20, marginBottom: 10 },
  recentCard: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderBottomWidth: 1, borderColor: palette.hairline, paddingVertical: 14 },
  recentDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12, backgroundColor: '#8D8278' },
  recentCopy: { flex: 1 },
  recentEmotion: { fontFamily: type.medium, color: palette.ink, fontSize: 14 },
  disclaimer: { fontFamily: type.regular, color: palette.inkMuted, fontSize: 11, lineHeight: 16, marginTop: 34, textAlign: 'center', paddingHorizontal: 32, opacity: 0.58 },
});
