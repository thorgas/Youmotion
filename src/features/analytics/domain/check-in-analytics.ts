import type { CheckIn } from '@/features/check-in/domain/check-in';
import { emotions } from '@/features/check-in/domain/emotion';
import type { BeliefSystemId } from '@/features/check-in/domain/belief-statement';
import assert from '@/assert';

export type EmotionFrequency = Readonly<{
  emotionId: CheckIn['emotionId'];
  count: number;
}>;

export type AnalyticsObservation =
  | Readonly<{ kind: 'history'; dayCount: number; momentCount: number }>
  | Readonly<{
    kind: 'emotion';
    emotionId: CheckIn['emotionId'];
    count: number;
    supportingIds: ReadonlyArray<CheckIn['id']>;
  }>
  | Readonly<{
    kind: 'belief';
    beliefSystemId: BeliefSystemId;
    emotionId: CheckIn['emotionId'];
    count: number;
    supportingIds: ReadonlyArray<CheckIn['id']>;
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
    const date = new Date(entry.occurredAt);
    assert(entry.occurredAt.length > 0, 'Recorded timestamps cannot be empty');
    assert(entry.createdAt.length > 0, 'Creation timestamps cannot be empty');
    if (Number.isNaN(date.getTime())) return [];
    return [`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`];
  })).size;
}

function twoHighestCounts<Item extends Readonly<{ count: number }>>(items: readonly Item[]) {
  assert(items.every((item) => Number.isFinite(item.count)), 'Ranked counts must be finite');
  assert(items.every((item) => item.count >= 0), 'Ranked counts cannot be negative');
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
  const frequencies = emotionFrequencies(entries);
  assert(frequencies.length === emotions.length, 'Every emotion must have a frequency');
  assert(frequencies.every(({ count }) => count >= 0), 'Emotion frequencies cannot be negative');
  const { first, second } = twoHighestCounts(frequencies);
  if (!first || first.count < 2 || first.count === second?.count) return null;
  return {
    kind: 'emotion',
    emotionId: first.emotionId,
    count: first.count,
    supportingIds: entries.flatMap((entry) => (
      entry.emotionId === first.emotionId ? [entry.id] : []
    )),
  } satisfies AnalyticsObservation;
}

function recurringBelief(entries: readonly CheckIn[]) {
  const frequencies = entries.reduce<ReadonlyArray<{
    beliefSystemId: BeliefSystemId;
    emotionId: CheckIn['emotionId'];
    count: number;
  }>>((pairs, entry) => {
    assert(pairs.every((pair) => pair.count > 0), 'Belief frequencies must stay positive');
    assert(pairs.length <= entries.length, 'Belief frequency groups cannot exceed entries');
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
  assert(frequencies.every(({ count }) => count > 0), 'Belief frequencies must be positive');
  assert(frequencies.length <= entries.length, 'Belief frequency groups cannot exceed entries');
  const { first, second } = twoHighestCounts(frequencies);
  if (!first || first.count < 2 || first.count === second?.count) return null;
  return {
    kind: 'belief',
    ...first,
    supportingIds: entries.flatMap((entry) => (
      (
        entry.beliefSystemId === first.beliefSystemId
        && entry.emotionId === first.emotionId
      ) ? [entry.id] : []
    )),
  } satisfies AnalyticsObservation;
}

function noteObservation(entries: readonly CheckIn[]) {
  const count = entries.filter((entry) => entry.note.length > 0).length;
  assert(count >= 0, 'Note count cannot be negative');
  assert(count <= entries.length, 'Note count cannot exceed the number of entries');
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
  const visibleObservations = observations.slice(0, 3);
  assert(visibleObservations.length > 0, 'Non-empty history must produce an observation');
  assert(visibleObservations.length <= 3, 'At most three observations can be visible');
  return visibleObservations;
}

export type PrimaryAnalyticsInsight = Extract<
  AnalyticsObservation,
  Readonly<{ kind: 'belief' | 'emotion' }>
>;

export function primaryAnalyticsInsights(
  entries: readonly CheckIn[],
): readonly PrimaryAnalyticsInsight[] {
  if (entries.length < 3) return [];
  const observations = analyticsObservations(entries);
  const belief = observations.find((observation) => observation.kind === 'belief');
  const emotion = observations.find((observation) => observation.kind === 'emotion');
  const insights = [
    ...(belief?.kind === 'belief' ? [belief] : []),
    ...(emotion?.kind === 'emotion' ? [emotion] : []),
  ];
  assert(insights.length <= 2, 'At most two primary insights can be returned');
  assert(
    insights.every(({ kind }) => kind === 'belief' || kind === 'emotion'),
    'Primary insights must be belief or emotion observations',
  );
  return insights;
}
