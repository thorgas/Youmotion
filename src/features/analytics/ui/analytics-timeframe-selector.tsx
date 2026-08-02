import { fbs } from 'fbtee';
import { PressableScale } from 'pressto';
import { StyleSheet, Text, View } from 'react-native';

import {
  ANALYTICS_TIMEFRAMES,
} from '@/constants';
import { palette, type } from '@/features/check-in/ui/theme';
import type { AppLocale } from '@/features/settings/domain/app-locale';
import {
  analyticsDateRange,
  type AnalyticsTimeframe,
} from '../domain/analytics-timeframe';
import { analyticsTimeframeRangeLabel } from './analytics-copy';

function TimeframeOption({
  label,
  onPress,
  selected,
  testID,
}: {
  label: string;
  onPress: () => void;
  selected: boolean;
  testID: string;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.option, selected ? styles.optionSelected : null]}
      testID={testID}
    >
      <Text style={[styles.optionText, selected ? styles.optionTextSelected : null]}>
        {label}
      </Text>
    </PressableScale>
  );
}

export function AnalyticsTimeframeSelector({
  locale,
  now,
  onAllTimePress,
  onFourWeeksPress,
  onLastWeekPress,
  timeframe,
}: {
  locale: AppLocale;
  now: Date;
  onAllTimePress: () => void;
  onFourWeeksPress: () => void;
  onLastWeekPress: () => void;
  timeframe: AnalyticsTimeframe;
}) {
  const range = analyticsDateRange({ now, timeframe });
  return (
    <View style={styles.section} testID="analytics-timeframe-selector">
      <Text style={styles.label}>
        <fbt desc="Label above the analytics timeframe selector">TIMEFRAME</fbt>
      </Text>
      <View style={styles.control}>
        <TimeframeOption
          label={String(fbs('Last week', 'Analytics timeframe option for the previous completed week'))}
          onPress={onLastWeekPress}
          selected={timeframe === ANALYTICS_TIMEFRAMES.LAST_WEEK}
          testID="analytics-timeframe-last-week"
        />
        <TimeframeOption
          label={String(fbs('4 weeks', 'Analytics timeframe option for the previous four completed weeks'))}
          onPress={onFourWeeksPress}
          selected={timeframe === ANALYTICS_TIMEFRAMES.LAST_FOUR_WEEKS}
          testID="analytics-timeframe-four-weeks"
        />
        <TimeframeOption
          label={String(fbs('All time', 'Analytics timeframe option for all recorded moments'))}
          onPress={onAllTimePress}
          selected={timeframe === ANALYTICS_TIMEFRAMES.ALL_TIME}
          testID="analytics-timeframe-all"
        />
      </View>
      <Text style={styles.range} testID="analytics-timeframe-range">
        {analyticsTimeframeRangeLabel({ locale, range, timeframe })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 22 },
  label: {
    fontFamily: type.semibold,
    color: palette.inkMuted,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  control: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 9,
    padding: 4,
    borderRadius: 16,
    backgroundColor: 'rgba(42, 39, 34, 0.06)',
  },
  option: {
    flex: 1,
    minHeight: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  optionSelected: {
    backgroundColor: palette.paperRaised,
    borderWidth: 1,
    borderColor: palette.hairline,
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  optionText: {
    fontFamily: type.medium,
    color: palette.inkMuted,
    fontSize: 12,
    textAlign: 'center',
  },
  optionTextSelected: { fontFamily: type.semibold, color: palette.ink },
  range: {
    fontFamily: type.regular,
    color: palette.inkMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 7,
  },
});
