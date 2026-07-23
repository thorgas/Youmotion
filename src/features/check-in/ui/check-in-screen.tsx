import { useSelector as useActorSelector } from '@xstate/react';
import { useSelector as useStoreSelector } from '@xstate/store-react';
import { PressableScale } from 'pressto';
import { useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  CHECK_IN_EVENTS,
  CHECK_IN_STATES,
  NAVIGATION_STATES,
} from '@/constants';
import {
  tabScreenEyebrowStyle,
  tabScreenTitleStyle,
} from '@/components/ui/tab-screen-layout';
import { useAppNavigationActor } from '@/navigation/app-navigation.provider';
import type { EmotionSelection } from '../domain/check-in';
import { selectionForCheckIn } from '../domain/emotion';
import { checkInHistoryStore } from '../application/check-in-history.store';
import { EmotionStar } from './emotion-star';
import { emotionSummary } from './emotion-copy';
import { palette, type } from './theme';

const _selectSnapshot = (snapshot: ReturnType<ReturnType<typeof useAppNavigationActor>['getSnapshot']>) => snapshot;
const _selectHistory = (state: ReturnType<typeof checkInHistoryStore.getSnapshot>) => state.context.entries;
const _samePreview = ({
  current,
  next,
}: {
  current: EmotionSelection | null;
  next: EmotionSelection | null;
}) => {
  if (!current || !next) return current === next;
  return current.emotionId === next.emotionId && current.level === next.level;
};
const _sameSelection = ({
  current,
  next,
}: {
  current: EmotionSelection | null;
  next: EmotionSelection | null;
}) => {
  if (!_samePreview({ current, next })) return false;
  if (!current || !next) return true;
  return current.intensity === next.intensity && current.color === next.color;
};

export function CheckInScreen() {
  const actor = useAppNavigationActor();
  const snapshot = useActorSelector(actor, _selectSnapshot);
  const entries = useStoreSelector(checkInHistoryStore, _selectHistory);
  const latestSelection = useRef(snapshot.context.selection);
  const publishedSelection = useRef(snapshot.context.selection);
  const latest = entries[0];
  const editing = snapshot.context.editing !== null;
  const centerOrigin = snapshot.matches({
    [NAVIGATION_STATES.TABS]: {
      [NAVIGATION_STATES.TODAY]: CHECK_IN_STATES.IDLE,
    },
  });

  const _touchStarted = () => {
    latestSelection.current = snapshot.context.selection;
    publishedSelection.current = snapshot.context.selection;
    actor.send({ type: CHECK_IN_EVENTS.TOUCH_STARTED });
  };
  const _selectionChanged = (selection: EmotionSelection | null) => {
    latestSelection.current = selection;
    if (_samePreview({ current: publishedSelection.current, next: selection })) return;
    publishedSelection.current = selection;
    actor.send({ type: CHECK_IN_EVENTS.SELECTION_CHANGED, selection });
  };
  const _selectionCancelled = () => actor.send({ type: CHECK_IN_EVENTS.SELECTION_CANCELLED });
  const _emotionHelpToggled = () => actor.send({ type: CHECK_IN_EVENTS.EMOTION_HELP_TOGGLED });
  const _selectionReleased = () => {
    if (!_sameSelection({ current: publishedSelection.current, next: latestSelection.current })) {
      publishedSelection.current = latestSelection.current;
      actor.send({ type: CHECK_IN_EVENTS.SELECTION_CHANGED, selection: latestSelection.current });
    }
    actor.send({ type: CHECK_IN_EVENTS.SELECTION_RELEASED });
  };
  const _editLatest = () => {
    if (latest) actor.send({ type: CHECK_IN_EVENTS.EDIT_REQUESTED, entry: latest });
  };

  return (
    <View style={styles.page} testID="today-screen">
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.gestureRegion} testID="check-in-gesture-region">
          <View style={styles.header}>
            <Text style={styles.eyebrow} testID="today-eyebrow">
              <fbt desc="Today check-in screen eyebrow heading">TODAY</fbt>
            </Text>
            <Text style={styles.title}>
              {editing
                ? <fbt desc="Question shown while changing the feeling in an existing check-in">How did you feel then?</fbt>
                : <fbt desc="Question asking the user about their current feeling">How are you feeling right now?</fbt>}
            </Text>
          </View>
          <View style={styles.starCard} testID="today-pulse-card">
            <EmotionStar
              centerOrigin={centerOrigin}
              contentInset={20}
              emotionHelpExpanded={snapshot.context.emotionHelpVisible}
              selection={snapshot.context.selection}
              onCancel={_selectionCancelled}
              onEmotionHelpToggle={_emotionHelpToggled}
              onTouchStart={_touchStarted}
              onSelectionChange={_selectionChanged}
              onRelease={_selectionReleased}
            />
          </View>
        </View>
        <ScrollView
          contentContainerStyle={styles.detailsContent}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          style={styles.detailsScroll}
          testID="check-in-details-scroll">
          {latest && !editing ? (
            <View style={styles.recent}>
              <Text style={styles.sectionTitle}><fbt desc="Heading for the most recent check-in">Latest check-in</fbt></Text>
              <PressableScale accessibilityRole="button" onPress={_editLatest} style={styles.recentCard}>
                <View
                  style={[
                    styles.recentDot,
                    { backgroundColor: selectionForCheckIn(latest).color },
                  ]}
                />
                <View style={styles.recentCopy}>
                  <Text style={styles.recentEmotion}>{emotionSummary(latest)}</Text>
                </View>
                <Text accessibilityElementsHidden style={styles.disclosure}>›</Text>
              </PressableScale>
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
  gestureRegion: { width: '100%', maxWidth: 520, alignSelf: 'center', paddingHorizontal: 16 },
  detailsScroll: { flex: 1, width: '100%', maxWidth: 520, alignSelf: 'center' },
  detailsContent: { flexGrow: 1, paddingHorizontal: 16, paddingBottom: 32 },
  header: { marginTop: 18, paddingHorizontal: 6 },
  eyebrow: tabScreenEyebrowStyle,
  title: {
    ...tabScreenTitleStyle,
    letterSpacing: -0.6,
    maxWidth: 330,
  },
  starCard: {
    alignItems: 'center',
    backgroundColor: palette.paperRaised,
    borderColor: palette.hairline,
    borderCurve: 'continuous',
    borderRadius: 30,
    borderWidth: 1,
    marginTop: 20,
    paddingBottom: 18,
    paddingTop: 22,
  },
  recent: { marginTop: 28 },
  sectionTitle: { fontFamily: type.medium, color: palette.ink, fontSize: 20, marginBottom: 10 },
  recentCard: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderBottomWidth: 1, borderColor: palette.hairline, paddingVertical: 14 },
  recentDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  recentCopy: { flex: 1 },
  recentEmotion: { fontFamily: type.medium, color: palette.ink, fontSize: 14 },
  disclosure: { fontFamily: type.regular, color: palette.inkMuted, fontSize: 24, lineHeight: 24 },
  disclaimer: { fontFamily: type.regular, color: palette.inkMuted, fontSize: 11, lineHeight: 16, marginTop: 24, textAlign: 'center', paddingHorizontal: 32 },
});
