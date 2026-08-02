import { HISTORY_CONTENT_FILTERS } from '@/constants';
import type { CheckIn, EmotionId } from '../domain/check-in';
import type { BeliefSystemId } from '../domain/belief-statement';

export type HistoryFilters = Readonly<{
  beliefSystemId: BeliefSystemId | null;
  content: typeof HISTORY_CONTENT_FILTERS[keyof typeof HISTORY_CONTENT_FILTERS];
  emotionId: EmotionId | null;
  query: string;
}>;

export function filterHistoryEntries({
  entries,
  filters,
  searchableText,
}: {
  entries: readonly CheckIn[];
  filters: HistoryFilters;
  searchableText: (entry: CheckIn) => string;
}) {
  const query = filters.query.trim().toLocaleLowerCase();
  return entries.filter((entry) => {
    if (filters.emotionId !== null && entry.emotionId !== filters.emotionId) return false;
    if (
      filters.beliefSystemId !== null
      && entry.beliefSystemId !== filters.beliefSystemId
    ) return false;
    if (filters.content === HISTORY_CONTENT_FILTERS.NOTES && entry.note.trim() === '') return false;
    if (filters.content === HISTORY_CONTENT_FILTERS.BELIEFS && entry.beliefSystemId === undefined) {
      return false;
    }
    return query === '' || searchableText(entry).toLocaleLowerCase().includes(query);
  });
}
