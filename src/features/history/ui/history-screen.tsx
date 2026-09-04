import { useSelector as useActorSelector } from '@xstate/react';
import { useSelector } from '@xstate/store-react';
import { fbs } from 'fbtee';
import { PressableScale } from 'pressto';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import assert from '@/assert';

import { formatHistoryDate } from '@/localization/date-copy';
import { useAppLocale } from '@/localization/app-locale-provider';
import {
  ANALYTICS_TIMEFRAMES,
  CHECK_IN_EVENTS,
  EMOTION_IDS,
  HISTORY_CONTENT_FILTERS,
  HISTORY_EVENTS,
} from '@/constants';
import {
  tabScreenContentStyle,
} from '@/components/ui/tab-screen-layout';
import { ScreenHeading } from '@/components/ui/screen-heading';
import { AnalyticsTimeframeSelector } from '@/features/analytics/ui/analytics-timeframe-selector';
import { entriesForAnalyticsTimeframe } from '@/features/analytics/domain/analytics-timeframe';
import { useAppNavigationActor } from '@/navigation/app-navigation.provider';
import { checkInHistoryStore } from '@/app-stores';
import { filterHistoryEntries } from '../application/history-filter';
import { historyTimeframeStore } from '@/app-stores';
import type { CheckIn, EmotionId } from '@/features/check-in/domain/check-in';
import { selectionForCheckIn } from '@/features/check-in/domain/emotion';
import type { BeliefStatement } from '@/features/beliefs/domain/belief-statement';
import { emotionName, emotionSummary } from '@/features/check-in/ui/emotion-copy';
import {
  beliefSystemText,
  guidingBeliefSystemText,
} from '@/features/beliefs/ui/belief-system-copy';
import {
  confirmCheckInDeletion,
  editMomentAccessibilityHint,
} from '@/features/check-in/ui/check-in-deletion';
import { borderColors, palette, surfaceColors, type } from '@/theme';

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
const _changeQuery = (query: string) => {
  historyTimeframeStore.trigger[HISTORY_EVENTS.QUERY_CHANGED]({ query });
};
const _toggleFilters = () => historyTimeframeStore.trigger[HISTORY_EVENTS.FILTERS_TOGGLED]({});
const _clearFilters = () => historyTimeframeStore.trigger[HISTORY_EVENTS.FILTERS_CLEARED]({});

function EmotionFilterChip({ emotionId, selected, label, disabled = false }: {
  emotionId: EmotionId | null;
  selected: boolean;
  label: string;
  disabled?: boolean;
}) {
  assert(emotionId === null || Object.values(EMOTION_IDS).includes(emotionId), 'Emotion filter must reference the catalog.');
  assert(Object.values(EMOTION_IDS).length > 0, 'Emotion filters require a populated catalog.');
  const _select = () => {
    historyTimeframeStore.trigger[HISTORY_EVENTS.EMOTION_FILTER_SELECTED]({ emotionId });
  };
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={_select}
      style={[styles.filterChip, selected ? styles.filterChipSelected : null, disabled ? styles.disabled : null]}
      testID={`history-emotion-filter-${emotionId ?? 'all'}`}
    >
      <Text style={[styles.filterChipText, selected ? styles.filterChipTextSelected : null]}>
        {label}
      </Text>
    </PressableScale>
  );
}

type HistoryContent = typeof HISTORY_CONTENT_FILTERS[keyof typeof HISTORY_CONTENT_FILTERS];

function contentFilterLabel(content: HistoryContent) {
  assert(Object.values(HISTORY_CONTENT_FILTERS).includes(content), 'History content filter must be supported.');
  assert(Object.values(HISTORY_CONTENT_FILTERS).length === 3, 'History content filters must cover all, notes, and beliefs.');
  if (content === HISTORY_CONTENT_FILTERS.NOTES) {
    return String(fbs('Reflections', 'History content filter for moments with written reflections'));
  }
  if (content === HISTORY_CONTENT_FILTERS.BELIEFS) {
    return String(fbs('Beliefs', 'History content filter for moments with beliefs'));
  }
  return String(fbs('All', 'History content filter showing every kind of moment'));
}

function ContentFilterChip({ content, selected, label, disabled = false }: {
  content: HistoryContent;
  selected: boolean;
  label: string;
  disabled?: boolean;
}) {
  assert(Object.values(HISTORY_CONTENT_FILTERS).includes(content), 'Content chip must use a supported filter.');
  assert(Object.values(HISTORY_CONTENT_FILTERS).includes(HISTORY_CONTENT_FILTERS.ALL), 'Content filters must include the all option.');
  const _select = () => {
    historyTimeframeStore.trigger[HISTORY_EVENTS.CONTENT_FILTER_SELECTED]({ content });
  };
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={_select}
      style={[styles.filterChip, selected ? styles.filterChipSelected : null, disabled ? styles.disabled : null]}
      testID={`history-content-filter-${content}`}
    >
      <Text style={[styles.filterChipText, selected ? styles.filterChipTextSelected : null]}>
        {label}
      </Text>
    </PressableScale>
  );
}

type HistorySelection = ReturnType<typeof historyTimeframeStore.getSnapshot>['context'];

function HistoryFilterSheet({ activeFilterCount, selection }: {
  activeFilterCount: number;
  selection: HistorySelection;
}) {
  if (!selection.filtersOpen) return null;

  return (
    <View style={styles.filterPanel} testID="history-filter-panel">
      <Text style={styles.filterLabel}><fbt desc="History filter group label">EMOTION</fbt></Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.filterChips}>
          <EmotionFilterChip emotionId={null} label={String(fbs('All', 'History emotion filter showing every emotion'))} selected={selection.emotionId === null} />
          {Object.values(EMOTION_IDS).map((emotionId) => <EmotionFilterChip key={emotionId} emotionId={emotionId} label={emotionName(emotionId)} selected={selection.emotionId === emotionId} />)}
        </View>
      </ScrollView>
      <Text style={styles.filterLabel}><fbt desc="History filter group label">CONTENT</fbt></Text>
      <View style={styles.filterChips}>
        <ContentFilterChip content={HISTORY_CONTENT_FILTERS.ALL} label={contentFilterLabel(HISTORY_CONTENT_FILTERS.ALL)} selected={selection.content === HISTORY_CONTENT_FILTERS.ALL} />
        <ContentFilterChip content={HISTORY_CONTENT_FILTERS.NOTES} label={contentFilterLabel(HISTORY_CONTENT_FILTERS.NOTES)} selected={selection.content === HISTORY_CONTENT_FILTERS.NOTES} />
        <ContentFilterChip content={HISTORY_CONTENT_FILTERS.BELIEFS} label={contentFilterLabel(HISTORY_CONTENT_FILTERS.BELIEFS)} selected={selection.content === HISTORY_CONTENT_FILTERS.BELIEFS} />
      </View>
      {activeFilterCount > 0 || selection.query !== '' ? (
        <PressableScale
          accessibilityRole="button"
          onPress={_clearFilters}
          style={styles.clearFilters}
          testID="history-filters-clear"
        >
          <Text style={styles.clearFiltersText}><fbt desc="Button clearing all History filters">Clear filters</fbt></Text>
        </PressableScale>
      ) : null}
    </View>
  );
}

function HistoryBelief({
  entry,
  statements,
}: {
  entry: CheckIn;
  statements: readonly BeliefStatement[];
}) {
  assert(entry.id.length > 0, 'History belief entry must have an identifier.');
  assert(entry.beliefSystemId === undefined || entry.beliefSystemId.length > 0, 'History belief identifier must not be empty.');
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

function MomentRow({
  children,
  disabled = false,
  entry,
}: {
  children: ReactNode;
  disabled?: boolean;
  entry: CheckIn;
}) {
  assert(entry.id.length > 0, 'History moment must have an identifier.');
  assert(entry.intensity >= 0 && entry.intensity <= 1, 'History moment intensity must be normalized.');
  const actor = useAppNavigationActor();
  const _edit = () => actor.send({ type: CHECK_IN_EVENTS.EDIT_REQUESTED, entry });
  const _delete = () => actor.send({ type: CHECK_IN_EVENTS.DELETE_REQUESTED, id: entry.id });
  const _confirmDelete = () => confirmCheckInDeletion(_delete);

  return (
    <View style={styles.row}>
      <PressableScale
        accessibilityHint={editMomentAccessibilityHint()}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onLongPress={_confirmDelete}
        onPress={_edit}
        style={[styles.rowMain, disabled ? styles.disabled : null]}
        testID={`history-moment-${entry.id}`}
      >
        <View
          style={[
            styles.dot,
            { backgroundColor: selectionForCheckIn(entry).color },
          ]}
        />
        <View style={styles.rowCopy}>
          {children}
        </View>
        <Text accessibilityElementsHidden style={styles.disclosure}>›</Text>
      </PressableScale>
    </View>
  );
}

export function HistoryScreen({ now }: { now?: Date }) {
  const actor = useAppNavigationActor();
  const beliefStatements = useActorSelector(actor, _selectBeliefStatements);
  const history = useSelector(checkInHistoryStore, _selectHistory);
  const selection = useSelector(historyTimeframeStore, _selectTimeframe);
  const locale = useAppLocale();
  const currentDate = now ?? new Date();
  assert(!Number.isNaN(currentDate.getTime()), 'History reference date must be valid.');
  assert(history.entries.every((entry) => entry.id.length > 0), 'History entries require identifiers.');
  const scopedEntries = entriesForAnalyticsTimeframe({
    entries: history.entries,
    now: currentDate,
    timeframe: selection.timeframe,
  });
  const displayedEntries = filterHistoryEntries({
    entries: scopedEntries,
    filters: selection,
    searchableText: (entry) => [
      emotionSummary(entry),
      entry.note,
      entry.beliefSystemId === undefined
        ? ''
        : beliefSystemText({ id: entry.beliefSystemId, statements: beliefStatements }),
      entry.beliefSystemId === undefined
        ? ''
        : guidingBeliefSystemText({ id: entry.beliefSystemId, statements: beliefStatements }) ?? '',
    ].join(' '),
  });
  const activeFilterCount = Number(selection.emotionId !== null)
    + Number(selection.content !== HISTORY_CONTENT_FILTERS.ALL)
    + Number(selection.beliefSystemId !== null);

  return (
    <View style={styles.page} testID="history-screen">
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ScreenHeading.Root>
            <ScreenHeading.EyebrowText testID="history-eyebrow"><fbt desc="Check-in history eyebrow heading">YOUR HISTORY</fbt></ScreenHeading.EyebrowText>
            <ScreenHeading.TitleText size="compact"><fbt desc="Check-in history title">Moments you noticed.</fbt></ScreenHeading.TitleText>
          </ScreenHeading.Root>
          <View style={styles.localStatus}>
            <View style={styles.localStatusDot} />
            <Text style={styles.intro}><fbt desc="Privacy note above check-in history">Your check-ins stay locally on this device.</fbt></Text>
          </View>
          <AnalyticsTimeframeSelector
            locale={locale}
            now={currentDate}
            onAllTimePress={_selectAllTime}
            onFourWeeksPress={_selectLastFourWeeks}
            onLastWeekPress={_selectLastWeek}
            timeframe={selection.timeframe}
          />
          <View style={styles.searchRow}>
            <TextInput
              accessibilityLabel={String(fbs('Search history', 'Accessibility label for History search input'))}
              autoCapitalize="none"
              onChangeText={_changeQuery}
              placeholder={String(fbs('Search your moments', 'Placeholder for History search input'))}
              placeholderTextColor={palette.inkMuted}
              returnKeyType="search"
              style={styles.searchInput}
              testID="history-search-input"
              value={selection.query}
            />
            <PressableScale
              accessibilityRole="button"
              accessibilityState={{ expanded: selection.filtersOpen }}
              onPress={_toggleFilters}
              style={[styles.filterToggle, activeFilterCount > 0 ? styles.filterToggleActive : null]}
              testID="history-filters-toggle"
            >
              <Text style={styles.filterToggleText}>
                <fbt desc="Button opening History filters">Filters</fbt>
                {activeFilterCount > 0 ? ` · ${activeFilterCount}` : ''}
              </Text>
            </PressableScale>
          </View>
          <HistoryFilterSheet activeFilterCount={activeFilterCount} selection={selection} />
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
                  <fbt desc="Empty filtered check-in history title">No matching moments.</fbt>
                </Text>
                <Text style={styles.emptyCopy}>
                  <fbt desc="Empty filtered check-in history explanation">
                    Try another search, filter, or timeframe.
                  </fbt>
                </Text>
              </View>
            ) : displayedEntries.map((entry) => (
              <MomentRow
                key={entry.id}
                entry={entry}
              >
                <Text style={styles.emotion}>{emotionSummary(entry)}</Text>
                <Text style={styles.date}>{formatHistoryDate({ date: new Date(entry.occurredAt), locale })}</Text>
                {entry.note ? <Text style={styles.note}>{entry.note}</Text> : null}
                <HistoryBelief entry={entry} statements={beliefStatements} />
              </MomentRow>
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
  localStatus: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 11 },
  localStatusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: palette.moss },
  intro: { fontFamily: type.regular, color: palette.inkMuted, fontSize: 13, lineHeight: 19 },
  searchRow: { flexDirection: 'row', gap: 9, marginTop: 18 },
  searchInput: {
    flex: 1,
    minHeight: 46,
    borderRadius: 15,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: palette.hairline,
    backgroundColor: palette.paperRaised,
    color: palette.ink,
    fontFamily: type.regular,
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 15,
    paddingVertical: 0,
    textAlignVertical: 'center',
  },
  filterToggle: {
    minHeight: 46,
    justifyContent: 'center',
    paddingHorizontal: 15,
    borderRadius: 15,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: palette.hairline,
    backgroundColor: palette.paperRaised,
  },
  filterToggleActive: { borderColor: palette.moss, backgroundColor: surfaceColors.mossWash },
  filterToggleText: { fontFamily: type.semibold, color: palette.ink, fontSize: 13 },
  filterPanel: {
    gap: 10,
    marginTop: 10,
    padding: 15,
    borderRadius: 18,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: palette.hairline,
    backgroundColor: palette.paperRaised,
  },
  filterLabel: { fontFamily: type.semibold, color: palette.inkMuted, fontSize: 9, letterSpacing: 1.1, marginTop: 2 },
  filterChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  filterChip: { minHeight: 34, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 17, backgroundColor: palette.paper, borderWidth: 1, borderColor: palette.hairline },
  filterChipSelected: { backgroundColor: palette.ink, borderColor: palette.ink },
  filterChipText: { fontFamily: type.medium, color: palette.inkMuted, fontSize: 12 },
  filterChipTextSelected: { color: palette.paperRaised },
  disabled: { opacity: 0.42 },
  clearFilters: { alignSelf: 'flex-start', minHeight: 34, justifyContent: 'center' },
  clearFiltersText: { fontFamily: type.semibold, color: palette.moss, fontSize: 12 },
  results: {
    backgroundColor: palette.paperRaised,
    borderColor: palette.hairline,
    borderRadius: 22,
    borderCurve: 'continuous',
    borderWidth: 1,
    marginTop: 24,
    overflow: 'hidden',
  },
  empty: { borderRadius: 26, backgroundColor: palette.paperRaised, borderWidth: 1, borderColor: palette.hairline, padding: 26 },
  emptyTitle: { fontFamily: type.medium, color: palette.ink, fontSize: 22 },
  emptyCopy: { fontFamily: type.regular, color: palette.inkMuted, fontSize: 14, lineHeight: 21, marginTop: 8 },
  error: { fontFamily: type.medium, color: palette.danger, fontSize: 12, lineHeight: 18, paddingBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: palette.hairline },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 17,
    paddingVertical: 17,
  },
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
    backgroundColor: palette.selectionWash,
    borderColor: borderColors.moss20,
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
