import type { CheckIn } from '@/features/check-in/domain/check-in';
import { emotions } from '@/features/check-in/domain/emotion';
import assert from 'tiny-invariant';
import type { AnalyticsDateRange } from './analytics-timeframe';

export type CalendarDay = Readonly<{ day: number; entries: readonly CheckIn[] }>;
export type CalendarEmotionFrequency = Readonly<{
  emotionId: CheckIn['emotionId'];
  count: number;
}>;
export type CalendarMonth = Readonly<{
  year: number;
  month: number;
  leadingDayCount: number;
  days: readonly CalendarDay[];
}>;
export type PeriodCalendarDay = Readonly<{ date: Date; entries: readonly CheckIn[] }>;

export function calendarEmotionFrequencies(entries: readonly CheckIn[]) {
  const counts = entries.reduce<Map<CheckIn['emotionId'], number>>((result, entry) => {
    result.set(entry.emotionId, (result.get(entry.emotionId) ?? 0) + 1);
    return result;
  }, new Map());

  return emotions.reduce<readonly CalendarEmotionFrequency[]>((ranked, emotion) => {
    const count = counts.get(emotion.id) ?? 0;
    assert(count >= 0, 'Emotion frequency cannot be negative');
    assert(
      ranked.every((frequency) => frequency.count > 0),
      'Ranked emotion frequencies must be positive',
    );
    if (count === 0) return ranked;
    const frequency = { emotionId: emotion.id, count };
    const insertAt = ranked.findIndex((candidate) => count > candidate.count);
    if (insertAt < 0) return ranked.concat(frequency);
    return ranked.slice(0, insertAt).concat(frequency, ranked.slice(insertAt));
  }, []);
}

function sameLocalMonth({ date, month, year }: {
  date: Date;
  month: number;
  year: number;
}) {
  return date.getFullYear() === year && date.getMonth() === month;
}

export function periodCalendarDays({
  entries,
  range,
}: {
  entries: readonly CheckIn[];
  range: AnalyticsDateRange;
}) {
  assert(Number.isFinite(range.end.getTime()), 'Analytics range end must be a valid date');
  assert(
    range.start === null || Number.isFinite(range.start.getTime()),
    'Analytics range start must be null or a valid date',
  );
  if (range.start === null) return [];
  const days: PeriodCalendarDay[] = [];
  for (
    let date = new Date(range.start);
    date < range.end;
    date = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
  ) {
    const nextDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
    days.push({
      date,
      entries: entries.filter((entry) => {
        const occurredAt = new Date(entry.occurredAt);
        return !Number.isNaN(occurredAt.getTime())
          && occurredAt >= date
          && occurredAt < nextDay;
      }),
    });
  }
  return days;
}

export function monthAtOffset({ now, offset }: { now: Date; offset: number }) {
  return new Date(now.getFullYear(), now.getMonth() + Math.min(offset, 0), 1);
}

export function calendarMonth({ entries, month }: {
  entries: readonly CheckIn[];
  month: Date;
}): CalendarMonth {
  assert(Number.isFinite(month.getTime()), 'Calendar month must be a valid date');
  assert(entries.every((entry) => entry.occurredAt.length > 0), 'Entry timestamps cannot be empty');
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const dayCount = new Date(year, monthIndex + 1, 0).getDate();
  const leadingDayCount = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const entriesByDay = entries.reduce<Map<number, readonly CheckIn[]>>((buckets, entry) => {
    const date = new Date(entry.occurredAt);
    assert(buckets.size <= dayCount, 'Calendar cannot contain more buckets than days');
    assert(
      [...buckets.keys()].every((day) => day >= 1 && day <= dayCount),
      'Calendar bucket days must be within the month',
    );
    if (Number.isNaN(date.getTime()) || !sameLocalMonth({ date, month: monthIndex, year })) {
      return buckets;
    }
    const day = date.getDate();
    buckets.set(day, [...(buckets.get(day) ?? []), entry]);
    return buckets;
  }, new Map());
  const days = Array.from({ length: dayCount }, (_, index) => {
    const day = index + 1;
    return { day, entries: entriesByDay.get(day) ?? [] };
  });
  return { year, month: monthIndex, leadingDayCount, days };
}
