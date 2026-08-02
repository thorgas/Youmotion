import { useSelector as useActorSelector } from '@xstate/react';
import { useSelector } from '@xstate/store-react';
import { fbs } from 'fbtee';
import { PressableScale } from 'pressto';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatHistoryDate } from '@/localization/date-copy';
import { useAppLocale } from '@/localization/app-locale-provider';
import {
  ANALYTICS_TIMEFRAMES,
  CHECK_IN_EVENTS,
  HISTORY_EVENTS,
} from '@/constants';
import {
  tabScreenContentStyle,
  tabScreenEyebrowStyle,
  tabScreenTitleStyle,
} from '@/components/ui/tab-screen-layout';
import { AnalyticsTimeframeSelector } from '@/features/analytics/ui/analytics-timeframe-selector';
import { entriesForAnalyticsTimeframe } from '@/features/analytics/domain/analytics-timeframe';
import { useAppNavigationActor } from '@/navigation/app-navigation.provider';
import { checkInHistoryStore } from '../application/check-in-history.store';
import { historyTimeframeStore } from '../application/history-timeframe.store';
import type { CheckIn } from '../domain/check-in';
import { selectionForCheckIn } from '../domain/emotion';
import type { BeliefStatement } from '../domain/belief-statement';
import { emotionSummary } from './emotion-copy';
import {
  beliefSystemText,
  guidingBeliefSystemText,
} from './belief-system-copy';
import {
  confirmCheckInDeletion,
  editMomentAccessibilityHint,
} from './check-in-deletion';
import { palette, type } from './theme';

const _selectHistory = (state: ReturnType<typeof checkInHistoryStore.getSnapshot>) => state.context;
const _selectTimeframe = (state: ReturnType<typeof historyTimeframeStore.getSnapshot>) => (
  state.context
);
const _selectBeliefStatements = (
  snapshot: ReturnType<ReturnType<typeof useAppNavigationActor>['getSnapshot']>,
) => snapshot.context.beliefStatements;
const _selectLastWeek = () => {
  historyTimeframeStore.trigger[HISTORY_EVENTS.TIMEFRAME_SELECTED]({
    timeframe: ANALYTICS_TIMEFRAMES.LAST_WEEK,
  });
};
const _selectLastFourWeeks = () => {
  historyTimeframeStore.trigger[HISTORY_EVENTS.TIMEFRAME_SELECTED]({
    timeframe: ANALYTICS_TIMEFRAMES.LAST_FOUR_WEEKS,
  });
};
const _selectAllTime = () => {
  historyTimeframeStore.trigger[HISTORY_EVENTS.TIMEFRAME_SELECTED]({
    timeframe: ANALYTICS_TIMEFRAMES.ALL_TIME,
  });
};
const _clearEvidence = () => {
  historyTimeframeStore.trigger[HISTORY_EVENTS.EVIDENCE_CLEARED]({});
};

function evidenceFilterCopy(count: number) {
  if (count === 1) {
    return String(fbs(
      'Showing 1 moment supporting this insight.',
      'History banner explaining that one evidence moment for a selected insight is visible',
    ));
  }
  return String(fbs(
    'Showing '
      + fbs.param('count', String(count))
      + ' moments supporting this insight.',
    'History banner explaining that only evidence for a selected insight is visible',
  ));
}

function HistoryBelief({
  entry,
  statements,
}: {
  entry: CheckIn;
  statements: readonly BeliefStatement[];
}) {
  if (!entry.beliefSystemId) return null;

  const harmfulStatement = beliefSystemText({
    id: entry.beliefSystemId,
    statements,
  });
  const guidingStatement = guidingBeliefSystemText({
    id: entry.beliefSystemId,
    statements,
  });

  if (!guidingStatement) {
    return (
      <View style={styles.beliefGroup}>
        <Text
          style={styles.beliefLabel}
          testID={`history-harmful-belief-label-${entry.id}`}
        >
          <fbt desc="Label for an unreframed harmful core belief in check-in history">
            Core belief
          </fbt>
        </Text>
        <Text
          style={styles.beliefSystem}
          testID={`history-harmful-belief-${entry.id}`}
        >
          {harmfulStatement}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.beliefGroup} testID={`history-belief-transition-${entry.id}`}>
      <Text style={styles.beliefLabel}>
        <fbt desc="Label for a harmful core belief that was reframed in check-in history">
          Released core belief
        </fbt>
      </Text>
      <Text
        style={styles.releasedBelief}
        testID={`history-released-belief-${entry.id}`}
      >
        {harmfulStatement}
      </Text>
      <View
        style={styles.guidingBeliefCard}
        testID={`history-guiding-belief-card-${entry.id}`}
      >
        <Text style={styles.guidingBeliefLabel}>
          <fbt desc="Label for the positive guiding belief in check-in history">
            Your guiding belief
          </fbt>
        </Text>
        <Text
          style={styles.guidingBelief}
          testID={`history-guiding-belief-${entry.id}`}
        >
          {guidingStatement}
        </Text>
      </View>
    </View>
  );
}

function MomentRow({ entry, locale }: { entry: CheckIn; locale: string }) {
  const actor = useAppNavigationActor();
  const beliefStatements = useActorSelector(actor, _selectBeliefStatements);
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
        <View
          style={[
            styles.dot,
            { backgroundColor: selectionForCheckIn(entry).color },
          ]}
        />
        <View style={styles.rowCopy}>
          <Text style={styles.emotion}>{emotionSummary(entry)}</Text>
          <Text style={styles.date}>{formatHistoryDate({ date: new Date(entry.createdAt), locale })}</Text>
          {entry.note ? <Text style={styles.note}>{entry.note}</Text> : null}
          <HistoryBelief entry={entry} statements={beliefStatements} />
        </View>
        <Text accessibilityElementsHidden style={styles.disclosure}>›</Text>
      </PressableScale>
    </View>
  );
}

export function HistoryScreen({ now }: { now?: Date }) {
  const history = useSelector(checkInHistoryStore, _selectHistory);
  const selection = useSelector(historyTimeframeStore, _selectTimeframe);
  const locale = useAppLocale();
  const currentDate = now ?? new Date();
  const scopedEntries = entriesForAnalyticsTimeframe({
    entries: history.entries,
    now: currentDate,
    timeframe: selection.timeframe,
  });
  const evidenceIds = new Set(selection.evidenceIds);
  const displayedEntries = evidenceIds.size === 0
    ? scopedEntries
    : scopedEntries.filter((entry) => evidenceIds.has(entry.id));

  return (
    <View style={styles.page} testID="history-screen">
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.eyebrow} testID="history-eyebrow"><fbt desc="Check-in history eyebrow heading">YOUR HISTORY</fbt></Text>
          <Text style={styles.title}><fbt desc="Check-in history title">Moments you noticed.</fbt></Text>
          <Text style={styles.intro}><fbt desc="Privacy note above check-in history">Your check-ins stay locally on this device.</fbt></Text>
          <AnalyticsTimeframeSelector
            locale={locale}
            now={currentDate}
            onAllTimePress={_selectAllTime}
            onFourWeeksPress={_selectLastFourWeeks}
            onLastWeekPress={_selectLastWeek}
            timeframe={selection.timeframe}
          />
          {evidenceIds.size > 0 ? (
            <View style={styles.evidenceFilter} testID="history-evidence-filter">
              <Text style={styles.evidenceFilterText}>
                {evidenceFilterCopy(displayedEntries.length)}
              </Text>
              <PressableScale
                accessibilityRole="button"
                onPress={_clearEvidence}
                style={styles.evidenceClear}
                testID="history-evidence-clear"
              >
                <Text style={styles.evidenceClearText}>
                  <fbt desc="Button clearing an insight evidence filter in History">Show all moments</fbt>
                </Text>
              </PressableScale>
            </View>
          ) : null}
          <View style={styles.results}>
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
            ) : displayedEntries.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>
                  <fbt desc="Empty filtered check-in history title">No moments in this period.</fbt>
                </Text>
                <Text style={styles.emptyCopy}>
                  <fbt desc="Empty filtered check-in history explanation">
                    Choose another timeframe to see more of your history.
                  </fbt>
                </Text>
              </View>
            ) : displayedEntries.map((entry) => (
              <MomentRow key={entry.id} entry={entry} locale={locale} />
            ))}
          </View>
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
  title: tabScreenTitleStyle,
  intro: { fontFamily: type.regular, color: palette.inkMuted, fontSize: 14, lineHeight: 21, marginTop: 10 },
  evidenceFilter: {
    gap: 10,
    marginTop: 18,
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(94, 111, 97, 0.32)',
    backgroundColor: '#EDF0EB',
  },
  evidenceFilterText: {
    fontFamily: type.medium,
    color: palette.ink,
    fontSize: 13,
    lineHeight: 19,
  },
  evidenceClear: { alignSelf: 'flex-start', minHeight: 32, justifyContent: 'center' },
  evidenceClearText: { fontFamily: type.semibold, color: palette.moss, fontSize: 12 },
  results: { marginTop: 28 },
  empty: { borderRadius: 26, backgroundColor: palette.paperRaised, borderWidth: 1, borderColor: palette.hairline, padding: 26 },
  emptyTitle: { fontFamily: type.medium, color: palette.ink, fontSize: 22 },
  emptyCopy: { fontFamily: type.regular, color: palette.inkMuted, fontSize: 14, lineHeight: 21, marginTop: 8 },
  error: { fontFamily: type.medium, color: palette.danger, fontSize: 12, lineHeight: 18, paddingBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderColor: palette.hairline },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 17, paddingRight: 10 },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 5, marginRight: 12 },
  rowCopy: { flex: 1 },
  disclosure: { fontFamily: type.regular, color: palette.inkMuted, fontSize: 24, lineHeight: 24 },
  emotion: { fontFamily: type.semibold, color: palette.ink, fontSize: 15 },
  date: { fontFamily: type.regular, color: palette.inkMuted, fontSize: 12, marginTop: 2 },
  note: { fontFamily: type.regular, color: palette.ink, fontSize: 13, lineHeight: 19, marginTop: 8 },
  beliefGroup: { gap: 7, marginTop: 11 },
  beliefLabel: {
    fontFamily: type.semibold,
    color: palette.releasedInk,
    fontSize: 9,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  beliefSystem: {
    fontFamily: type.regular,
    color: palette.inkMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  releasedBelief: {
    fontFamily: type.regular,
    color: palette.releasedInk,
    fontSize: 12,
    lineHeight: 18,
    textDecorationColor: palette.releasedInk,
    textDecorationLine: 'line-through',
  },
  guidingBeliefCard: {
    backgroundColor: '#EDF0EB',
    borderColor: 'rgba(94, 111, 97, 0.2)',
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 3,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  guidingBeliefLabel: {
    fontFamily: type.semibold,
    color: palette.moss,
    fontSize: 9,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  guidingBelief: {
    fontFamily: type.semibold,
    color: palette.ink,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 4,
  },
});
