import type { CheckIn } from '@/features/check-in/domain/check-in';
import { emotions } from '@/features/check-in/domain/emotion';
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
        const createdAt = new Date(entry.createdAt);
        return !Number.isNaN(createdAt.getTime())
          && createdAt >= date
          && createdAt < nextDay;
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
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const dayCount = new Date(year, monthIndex + 1, 0).getDate();
  const leadingDayCount = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const entriesByDay = entries.reduce<Map<number, readonly CheckIn[]>>((buckets, entry) => {
    const date = new Date(entry.createdAt);
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
