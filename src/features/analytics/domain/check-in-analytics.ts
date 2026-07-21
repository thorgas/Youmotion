import type { CheckIn } from '@/features/check-in/domain/check-in';
import { emotions } from '@/features/check-in/domain/emotion';
import type { BeliefSystemId } from '@/features/check-in/domain/belief-statement';

export type EmotionFrequency = Readonly<{
  emotionId: CheckIn['emotionId'];
  count: number;
}>;

export type AnalyticsObservation =
  | Readonly<{ kind: 'history'; dayCount: number; momentCount: number }>
  | Readonly<{ kind: 'emotion'; emotionId: CheckIn['emotionId']; count: number }>
  | Readonly<{
    kind: 'belief';
    beliefSystemId: BeliefSystemId;
    emotionId: CheckIn['emotionId'];
    count: number;
  }>
  | Readonly<{ kind: 'notes'; count: number; momentCount: number }>;

export function emotionFrequencies(entries: readonly CheckIn[]) {
  return emotions.map(({ id }) => ({
    emotionId: id,
    count: entries.filter((entry) => entry.emotionId === id).length,
  })) satisfies readonly EmotionFrequency[];
}

function recordedDayCount(entries: readonly CheckIn[]) {
  return new Set(entries.flatMap((entry) => {
    const date = new Date(entry.createdAt);
    if (Number.isNaN(date.getTime())) return [];
    return [`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`];
  })).size;
}

function twoHighestCounts<Item extends Readonly<{ count: number }>>(items: readonly Item[]) {
  let first: Item | undefined;
  let second: Item | undefined;
  items.forEach((item) => {
    if (!first || item.count > first.count) {
      second = first;
      first = item;
      return;
    }
    if (!second || item.count > second.count) second = item;
  });
  return { first, second };
}

function uniqueMostFrequentEmotion(entries: readonly CheckIn[]) {
  const { first, second } = twoHighestCounts(emotionFrequencies(entries));
  if (!first || first.count < 2 || first.count === second?.count) return null;
  return {
    kind: 'emotion',
    emotionId: first.emotionId,
    count: first.count,
  } satisfies AnalyticsObservation;
}

function recurringBelief(entries: readonly CheckIn[]) {
  const frequencies = entries.reduce<ReadonlyArray<{
    beliefSystemId: BeliefSystemId;
    emotionId: CheckIn['emotionId'];
    count: number;
  }>>((pairs, entry) => {
    if (!entry.beliefSystemId) return pairs;
    const existing = pairs.find((pair) => (
      pair.beliefSystemId === entry.beliefSystemId
      && pair.emotionId === entry.emotionId
    ));
    if (!existing) {
      return pairs.concat({
        beliefSystemId: entry.beliefSystemId,
        emotionId: entry.emotionId,
        count: 1,
      });
    }
    return pairs.map((pair) => pair === existing ? { ...pair, count: pair.count + 1 } : pair);
  }, []);
  const { first, second } = twoHighestCounts(frequencies);
  if (!first || first.count < 2 || first.count === second?.count) return null;
  return { kind: 'belief', ...first } satisfies AnalyticsObservation;
}

function noteObservation(entries: readonly CheckIn[]) {
  const count = entries.filter((entry) => entry.note.length > 0).length;
  if (count === 0) return null;
  return {
    kind: 'notes',
    count,
    momentCount: entries.length,
  } satisfies AnalyticsObservation;
}

export function analyticsObservations(entries: readonly CheckIn[]) {
  if (entries.length === 0) return [];
  const observations: AnalyticsObservation[] = [{
    kind: 'history',
    dayCount: recordedDayCount(entries),
    momentCount: entries.length,
  }];
  const emotion = uniqueMostFrequentEmotion(entries);
  if (emotion) observations.push(emotion);
  const belief = recurringBelief(entries);
  if (belief) observations.push(belief);
  const notes = noteObservation(entries);
  if (observations.length < 3 && notes) observations.push(notes);
  return observations.slice(0, 3);
}
