import { useSelector as useActorSelector } from '@xstate/react';
import { useSelector } from '@xstate/store-react';
import { fbs } from 'fbtee';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  FadeInDown,
  ReduceMotion,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ANALYTICS_EVENTS,
  ANALYTICS_TIMEFRAMES,
  MOTION_DURATION,
  MOTION_OFFSET,
} from '@/constants';
import {
  tabScreenContentStyle,
  tabScreenEyebrowStyle,
  tabScreenTitleStyle,
} from '@/components/ui/tab-screen-layout';
import { checkInHistoryStore } from '@/features/check-in/application/check-in-history.store';
import type { CheckIn } from '@/features/check-in/domain/check-in';
import { emotions } from '@/features/check-in/domain/emotion';
import type { BeliefStatement } from '@/features/check-in/domain/belief-statement';
import { emotionName } from '@/features/check-in/ui/emotion-copy';
import { palette, type } from '@/features/check-in/ui/theme';
import type { AppLocale } from '@/features/settings/domain/app-locale';
import { useAppLocale } from '@/localization/app-locale-provider';
import { useAppNavigationActor } from '@/navigation/app-navigation.provider';
import { analyticsStore } from '../application/analytics.store';
import {
  analyticsObservations,
  emotionFrequencies,
  type AnalyticsObservation,
  type EmotionFrequency,
} from '../domain/check-in-analytics';
import {
  calendarEmotionFrequencies,
  calendarMonth,
  monthAtOffset,
  periodCalendarDays,
} from '../domain/analytics-calendar';
import {
  analyticsDateRange,
  entriesForAnalyticsTimeframe,
  topLeitsaetzeForTimeframe,
  type AnalyticsTimeframe,
} from '../domain/analytics-timeframe';
import {
  analyticsMonthLabel,
  analyticsTimeframeRangeLabel,
  additionalTopLeitsaetzeCopy,
  analyticsWeekdayLabel,
  calendarDayAccessibilityLabel,
  observationCopy,
  topLeitsatzEvidenceCopy,
  topLeitsatzLabel,
} from './analytics-copy';
import { AnalyticsTimeframeSelector } from './analytics-timeframe-selector';
import { EmotionRadarChart } from './emotion-radar-chart';

const _selectHistory = (state: ReturnType<typeof checkInHistoryStore.getSnapshot>) => (
  state.context
);
const _selectCalendar = (state: ReturnType<typeof analyticsStore.getSnapshot>) => (
  state.context
);
const _selectBeliefStatements = (
  snapshot: ReturnType<ReturnType<typeof useAppNavigationActor>['getSnapshot']>,
) => snapshot.context.beliefStatements;
const emotionColors = new Map(emotions.map(({ color, id }) => [id, color]));
const _previousMonth = () => {
  analyticsStore.trigger[ANALYTICS_EVENTS.PREVIOUS_MONTH_REQUESTED]({});
};
const _nextMonth = () => {
  analyticsStore.trigger[ANALYTICS_EVENTS.NEXT_MONTH_REQUESTED]({});
};
const _selectLastWeek = () => {
  analyticsStore.trigger[ANALYTICS_EVENTS.TIMEFRAME_SELECTED]({
    timeframe: ANALYTICS_TIMEFRAMES.LAST_WEEK,
  });
};
const _selectLastFourWeeks = () => {
  analyticsStore.trigger[ANALYTICS_EVENTS.TIMEFRAME_SELECTED]({
    timeframe: ANALYTICS_TIMEFRAMES.LAST_FOUR_WEEKS,
  });
};
const _selectAllTime = () => {
  analyticsStore.trigger[ANALYTICS_EVENTS.TIMEFRAME_SELECTED]({
    timeframe: ANALYTICS_TIMEFRAMES.ALL_TIME,
  });
};
const leitsatzEntering = FadeInDown
  .duration(MOTION_DURATION.ENTER)
  .reduceMotion(ReduceMotion.System)
  .withInitialValues({
    opacity: 0,
    transform: [{ translateY: MOTION_OFFSET.STATE }],
  });

function TopLeitsatz({
  entries,
  locale,
  now,
  statements,
  timeframe,
}: {
  entries: readonly CheckIn[];
  locale: AppLocale;
  now: Date;
  statements: readonly BeliefStatement[];
  timeframe: AnalyticsTimeframe;
}) {
  const group = topLeitsaetzeForTimeframe({ entries, now, statements, timeframe });
  if (!group) return null;
  const multiple = group.leitsaetze.length > 1 || group.additionalCount > 0;
  const label = topLeitsatzLabel({ multiple, timeframe: group.timeframe });
  return (
    <Animated.View
      entering={leitsatzEntering}
      style={styles.leitsatzCard}
      testID="analytics-top-leitsatz"
    >
      <Text
        accessibilityLabel={label}
        style={styles.leitsatzLabel}
        testID="analytics-top-leitsatz-label"
      >
        {label}
      </Text>
      {group.leitsaetze.map((leitsatz, index) => {
        const evidence = topLeitsatzEvidenceCopy({
          leitsatz,
          locale,
          range: group.range,
          timeframe: group.timeframe,
        });
        return (
          <View
            key={leitsatz.beliefSystemId}
            style={index === 0 ? undefined : styles.leitsatzTie}
            testID={`analytics-top-leitsatz-${leitsatz.beliefSystemId}`}
          >
            <Text style={styles.leitsatzText}>“{leitsatz.guidingStatement}”</Text>
            <Text
              accessibilityLabel={evidence}
              style={styles.leitsatzEvidence}
              testID={`analytics-top-leitsatz-evidence-${leitsatz.beliefSystemId}`}
            >
              {evidence}
            </Text>
          </View>
        );
      })}
      {group.additionalCount > 0 ? (
        <Text style={styles.leitsatzAdditional}>
          {additionalTopLeitsaetzeCopy(group.additionalCount)}
        </Text>
      ) : null}
    </Animated.View>
  );
}

function observationLabel(observation: AnalyticsObservation) {
  if (observation.kind === 'history') {
    return String(fbs('All moments', 'Label for the analytics history summary observation'));
  }
  if (observation.kind === 'emotion') {
    return String(fbs('Recurring emotion', 'Label for a recurring emotion observation'));
  }
  if (observation.kind === 'belief') {
    return String(fbs('Recurring pair', 'Label for a recurring emotion and core belief observation'));
  }
  return String(fbs('Written reflections', 'Label for the analytics note usage observation'));
}

function observationKey(observation: AnalyticsObservation) {
  if (observation.kind === 'emotion') return `${observation.kind}-${observation.emotionId}`;
  if (observation.kind === 'belief') {
    return `${observation.kind}-${observation.emotionId}-${observation.beliefSystemId}`;
  }
  return observation.kind;
}

export function ObservationCard({ index, observation, statements }: {
  index: number;
  observation: AnalyticsObservation;
  statements: readonly BeliefStatement[];
}) {
  return (
    <View
      collapsable={false}
      style={styles.observation}
      testID={`analytics-observation-${index}`}
    >
      <View style={styles.observationRule} />
      <View style={styles.observationCopy}>
        <Text style={styles.observationLabel}>{observationLabel(observation)}</Text>
        <Text style={styles.observationText}>{observationCopy({ observation, statements })}</Text>
      </View>
    </View>
  );
}

function ObservationSection({ entries, statements }: {
  entries: readonly CheckIn[];
  statements: readonly BeliefStatement[];
}) {
  const observations = analyticsObservations(entries);
  if (observations.length === 0) return null;
  return (
    <View style={styles.section} testID="analytics-observations">
      <Text style={styles.sectionEyebrow}><fbt desc="Analytics observation section label">WHAT STANDS OUT</fbt></Text>
      <View style={styles.observationList}>
        {observations.map((observation, index) => (
          <ObservationCard
            index={index}
            key={observationKey(observation)}
            observation={observation}
            statements={statements}
          />
        ))}
      </View>
    </View>
  );
}

function FrequencyLegend({ frequencies }: { frequencies: readonly EmotionFrequency[] }) {
  return (
    <View style={styles.legendSection} testID="analytics-emotion-legend">
      <Text style={styles.legendExplanation}>
        <fbt desc="Explanation that emotion colors connect the radar chart and calendar">
          The same colors mark emotions in the chart and calendar.
        </fbt>
      </Text>
      <View style={styles.frequencyLegend}>
        {frequencies.map((frequency) => (
          <View
            accessible
            accessibilityLabel={`${emotionName(frequency.emotionId)}: ${frequency.count}`}
            key={frequency.emotionId}
            style={styles.frequencyItem}
          >
            <View style={[styles.frequencyDot, {
              backgroundColor: emotionColors.get(frequency.emotionId) ?? palette.inkMuted,
            }]} />
            <Text style={styles.frequencyName}>{emotionName(frequency.emotionId)}</Text>
            <Text style={styles.frequencyCount}>{frequency.count}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function EmptyCalendarCell() {
  return <View accessibilityElementsHidden style={styles.calendarCell} />;
}

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function CalendarDayCell({ date, entries, locale, today }: {
  date: Date;
  entries: readonly CheckIn[];
  locale: AppLocale;
  today: Date;
}) {
  const isToday = date.getFullYear() === today.getFullYear()
    && date.getMonth() === today.getMonth()
    && date.getDate() === today.getDate();
  const frequencies = calendarEmotionFrequencies(entries);
  return (
    <View
      accessible
      accessibilityLabel={calendarDayAccessibilityLabel({ date, frequencies, locale })}
      style={[styles.calendarCell, isToday ? styles.calendarToday : null]}
      testID={`analytics-calendar-day-${localDateKey(date)}`}
    >
      <Text style={[styles.calendarDayNumber, isToday ? styles.calendarTodayNumber : null]}>
        {date.getDate()}
      </Text>
      <View accessibilityElementsHidden style={styles.calendarDots}>
        {frequencies.map((frequency) => (
          <View
            key={frequency.emotionId}
            style={[styles.calendarDot, {
              backgroundColor: emotionColors.get(frequency.emotionId) ?? palette.inkMuted,
            }]}
          />
        ))}
      </View>
    </View>
  );
}

function WeekdayLabels({ locale }: { locale: AppLocale }) {
  const labels = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(2026, 0, 5 + index);
    return {
      key: String(date.getDay()),
      label: analyticsWeekdayLabel({ date, locale }),
    };
  });
  return (
    <View style={styles.weekdayRow}>
      {labels.map(({ key, label }) => (
        <Text key={key} style={styles.weekdayLabel}>{label}</Text>
      ))}
    </View>
  );
}

function PeriodCalendar({
  entries,
  locale,
  now,
  timeframe,
}: {
  entries: readonly CheckIn[];
  locale: AppLocale;
  now: Date;
  timeframe: AnalyticsTimeframe;
}) {
  const range = analyticsDateRange({ now, timeframe });
  const days = periodCalendarDays({ entries, range });
  return (
    <>
      <Text style={styles.sectionTitle} testID="analytics-calendar-period">
        {analyticsTimeframeRangeLabel({ locale, range, timeframe })}
      </Text>
      <Text style={styles.calendarExplanation}>
        <fbt desc="Explanation of distinct and frequency-ordered emotion colors in each analytics calendar date">
          See which emotions you noticed each day. Each color appears once, ordered from most to least frequent.
        </fbt>
      </Text>
      <WeekdayLabels locale={locale} />
      <View style={styles.calendarGrid}>
        {days.map((day) => (
          <CalendarDayCell
            date={day.date}
            entries={day.entries}
            key={localDateKey(day.date)}
            locale={locale}
            today={now}
          />
        ))}
      </View>
    </>
  );
}

function CalendarSection({ entries, locale, now }: {
  entries: readonly CheckIn[];
  locale: AppLocale;
  now: Date;
}) {
  const calendar = useSelector(analyticsStore, _selectCalendar);
  if (calendar.timeframe !== ANALYTICS_TIMEFRAMES.ALL_TIME) {
    return (
      <View collapsable={false} style={styles.section} testID="analytics-calendar">
        <Text style={styles.sectionEyebrow}>
          <fbt desc="Analytics calendar section label">MOMENTS CALENDAR</fbt>
        </Text>
        <PeriodCalendar
          entries={entries}
          locale={locale}
          now={now}
          timeframe={calendar.timeframe}
        />
      </View>
    );
  }
  const month = monthAtOffset({ now, offset: calendar.monthOffset });
  const model = calendarMonth({ entries, month });
  const monthLabel = analyticsMonthLabel({ date: month, locale });
  const leadingCells = Array.from(
    { length: model.leadingDayCount },
    (_, index) => `leading-${index + 1}`,
  );
  const isCurrentMonth = calendar.monthOffset === 0;

  return (
    <View collapsable={false} style={styles.section} testID="analytics-calendar">
      <Text style={styles.sectionEyebrow}><fbt desc="Analytics calendar section label">MOMENTS CALENDAR</fbt></Text>
      <View style={styles.calendarHeader}>
        <Text style={styles.sectionTitle} testID="analytics-calendar-month">{monthLabel}</Text>
        <View style={styles.calendarActions}>
          <Pressable
            accessibilityLabel={String(fbs('Previous month', 'Analytics calendar previous month button'))}
            accessibilityRole="button"
            hitSlop={8}
            onPress={_previousMonth}
            style={styles.monthButton}
            testID="analytics-calendar-previous"
          >
            <Text style={styles.monthButtonText}>‹</Text>
          </Pressable>
          <Pressable
            accessibilityLabel={String(fbs('Next month', 'Analytics calendar next month button'))}
            accessibilityRole="button"
            disabled={isCurrentMonth}
            hitSlop={8}
            onPress={_nextMonth}
            style={[styles.monthButton, isCurrentMonth ? styles.monthButtonDisabled : null]}
            testID="analytics-calendar-next"
          >
            <Text style={styles.monthButtonText}>›</Text>
          </Pressable>
        </View>
      </View>
      <Text style={styles.calendarExplanation}>
        <fbt desc="Explanation of distinct and frequency-ordered emotion colors in each analytics calendar date">
          See which emotions you noticed each day. Each color appears once, ordered from most to least frequent.
        </fbt>
      </Text>
      <WeekdayLabels locale={locale} />
      <View style={styles.calendarGrid}>
        {leadingCells.map((key) => (
          <EmptyCalendarCell key={key} />
        ))}
        {model.days.map((day) => (
          <CalendarDayCell
            date={new Date(model.year, model.month, day.day)}
            entries={day.entries}
            key={day.day}
            locale={locale}
            today={now}
          />
        ))}
      </View>
    </View>
  );
}

export function AnalyticsContent({ entries, locale, now, statements }: {
  entries: readonly CheckIn[];
  locale: AppLocale;
  now: Date;
  statements: readonly BeliefStatement[];
}) {
  const analytics = useSelector(analyticsStore, _selectCalendar);
  const dimensions = useWindowDimensions();
  const chartWidth = Math.min(Math.max(dimensions.width - 44, 280), 476);
  const scopedEntries = entriesForAnalyticsTimeframe({
    entries,
    now,
    timeframe: analytics.timeframe,
  });
  const frequencies = emotionFrequencies(scopedEntries);
  const labels = frequencies.map(({ emotionId }) => emotionName(emotionId));
  const colors = frequencies.map(({ emotionId }) => (
    emotionColors.get(emotionId) ?? palette.inkMuted
  ));

  return (
    <View style={styles.page} testID="analytics-screen">
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.eyebrow} testID="analytics-eyebrow"><fbt desc="Analytics screen eyebrow">YOUR INSIGHTS</fbt></Text>
          <Text style={styles.title}><fbt desc="Analytics screen title">Patterns you noticed.</fbt></Text>
          <Text style={styles.intro}>
            <fbt desc="Analytics screen explanation and privacy note">
              A private view of the moments you recorded on this device.
            </fbt>
          </Text>
          <AnalyticsTimeframeSelector
            locale={locale}
            now={now}
            onAllTimePress={_selectAllTime}
            onFourWeeksPress={_selectLastFourWeeks}
            onLastWeekPress={_selectLastWeek}
            timeframe={analytics.timeframe}
          />
          <TopLeitsatz
            entries={entries}
            locale={locale}
            now={now}
            statements={statements}
            timeframe={analytics.timeframe}
          />
          {scopedEntries.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>
                <fbt desc="Empty selected analytics timeframe title">No moments in this period.</fbt>
              </Text>
              <Text style={styles.emptyCopy}>
                <fbt desc="Empty selected analytics timeframe explanation">
                  Choose another timeframe or return after recording a new moment.
                </fbt>
              </Text>
            </View>
          ) : (
            <View
              collapsable={false}
              style={styles.constellationSection}
              testID="analytics-constellation"
            >
              <Text style={styles.sectionEyebrow}><fbt desc="Emotion constellation section label">EMOTIONAL CONSTELLATION</fbt></Text>
              <Text style={styles.sectionTitle}><fbt desc="Emotion constellation title">What you have been noticing.</fbt></Text>
              <Text style={styles.sectionCopy}>
                <fbt desc="Emotion constellation explanation">Each direction shows how often an emotion appears in the selected timeframe.</fbt>
              </Text>
              <EmotionRadarChart
                colors={colors}
                frequencies={frequencies}
                labels={labels}
                width={chartWidth}
              />
              <FrequencyLegend frequencies={frequencies} />
            </View>
          )}
          <CalendarSection entries={scopedEntries} locale={locale} now={now} />
          <ObservationSection entries={scopedEntries} statements={statements} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

export function AnalyticsScreen({ now }: { now?: Date }) {
  const actor = useAppNavigationActor();
  const statements = useActorSelector(actor, _selectBeliefStatements);
  const history = useSelector(checkInHistoryStore, _selectHistory);
  const locale = useAppLocale();
  const currentDate = now ?? new Date();
  return (
    <AnalyticsContent
      entries={history.entries}
      locale={locale}
      now={currentDate}
      statements={statements}
    />
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.paper },
  safeArea: { flex: 1 },
  content: tabScreenContentStyle,
  eyebrow: tabScreenEyebrowStyle,
  title: tabScreenTitleStyle,
  intro: { fontFamily: type.regular, color: palette.inkMuted, fontSize: 14, lineHeight: 21, marginTop: 10 },
  leitsatzCard: {
    marginTop: 26,
    padding: 21,
    borderRadius: 22,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(94, 111, 97, 0.32)',
    backgroundColor: '#EDF0EB',
  },
  leitsatzLabel: {
    fontFamily: type.semibold,
    color: palette.moss,
    fontSize: 10,
    letterSpacing: 1.05,
  },
  leitsatzText: {
    fontFamily: type.medium,
    color: palette.ink,
    fontSize: 21,
    lineHeight: 29,
    marginTop: 10,
  },
  leitsatzEvidence: {
    fontFamily: type.regular,
    color: palette.inkMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 11,
  },
  leitsatzTie: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(94, 111, 97, 0.24)',
    marginTop: 17,
    paddingTop: 7,
  },
  leitsatzAdditional: {
    fontFamily: type.regular,
    color: palette.inkMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 17,
  },
  section: { backgroundColor: palette.paper, marginTop: 34 },
  constellationSection: { backgroundColor: palette.paper, marginTop: 38 },
  sectionEyebrow: { fontFamily: type.semibold, color: palette.inkMuted, fontSize: 10, letterSpacing: 1.25 },
  sectionTitle: { fontFamily: type.semibold, color: palette.ink, fontSize: 22, lineHeight: 28, marginTop: 7 },
  sectionCopy: { fontFamily: type.regular, color: palette.inkMuted, fontSize: 13, lineHeight: 20, marginTop: 6 },
  legendSection: {
    marginTop: 2,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: palette.hairline,
  },
  legendExplanation: {
    fontFamily: type.regular,
    color: palette.inkMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  frequencyLegend: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 9, marginTop: 11 },
  frequencyItem: { flexBasis: '50%', flexDirection: 'row', alignItems: 'center', paddingRight: 12 },
  frequencyDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  frequencyName: { flex: 1, fontFamily: type.medium, color: palette.ink, fontSize: 13 },
  frequencyCount: { fontFamily: type.semibold, color: palette.inkMuted, fontSize: 12 },
  observationList: { gap: 12, marginTop: 16 },
  observation: {
    flexDirection: 'row',
    backgroundColor: palette.paperRaised,
    borderRadius: 18,
    padding: 17,
  },
  observationRule: { width: 3, borderRadius: 2, backgroundColor: palette.moss, marginRight: 13 },
  observationCopy: { flex: 1, minWidth: 0 },
  observationLabel: {
    fontFamily: type.semibold,
    color: palette.moss,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  observationText: {
    flexShrink: 1,
    fontFamily: type.medium,
    color: palette.ink,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 5,
  },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  calendarActions: { flexDirection: 'row', gap: 8, marginLeft: 12 },
  monthButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.paperRaised,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  monthButtonDisabled: { opacity: 0.34 },
  monthButtonText: { fontFamily: type.regular, color: palette.ink, fontSize: 24, lineHeight: 27 },
  calendarExplanation: { fontFamily: type.regular, color: palette.inkMuted, fontSize: 12, lineHeight: 18, marginTop: 7 },
  weekdayRow: { flexDirection: 'row', marginTop: 20, marginBottom: 7 },
  weekdayLabel: {
    flexBasis: '14.2857%',
    textAlign: 'center',
    fontFamily: type.semibold,
    color: palette.inkMuted,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarCell: {
    flexBasis: '14.2857%',
    minHeight: 54,
    borderRadius: 13,
    paddingTop: 7,
    alignItems: 'center',
  },
  calendarToday: { backgroundColor: 'rgba(94, 111, 97, 0.10)' },
  calendarDayNumber: { fontFamily: type.medium, color: palette.ink, fontSize: 12 },
  calendarTodayNumber: { fontFamily: type.semibold, color: palette.moss },
  calendarDots: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 3, width: 30, marginTop: 6 },
  calendarDot: { width: 5, height: 5, borderRadius: 3 },
  empty: { borderRadius: 24, backgroundColor: palette.paperRaised, padding: 24, marginTop: 30 },
  emptyTitle: { fontFamily: type.medium, color: palette.ink, fontSize: 20 },
  emptyCopy: { fontFamily: type.regular, color: palette.inkMuted, fontSize: 14, lineHeight: 21, marginTop: 7 },
});
