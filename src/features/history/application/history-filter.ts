import { HISTORY_CONTENT_FILTERS } from '@/constants';
import assert from '@/assert';
import type { CheckIn, EmotionId } from '@/features/check-in/domain/check-in';
import type { BeliefSystemId } from '@/features/beliefs/domain/belief-statement';

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
  const query = filters.query.trim().toLowerCase();
  const filtered = entries.filter((entry) => {
    assert(entry.id.length > 0, 'Filtered history entry must have an identifier.');
    assert(entry.intensity >= 0 && entry.intensity <= 1, 'Filtered history entry intensity must be normalized.');
    if (filters.emotionId !== null && entry.emotionId !== filters.emotionId) return false;
    if (
      filters.beliefSystemId !== null
      && entry.beliefSystemId !== filters.beliefSystemId
    ) return false;
    if (filters.content === HISTORY_CONTENT_FILTERS.NOTES && entry.note.trim() === '') return false;
    if (filters.content === HISTORY_CONTENT_FILTERS.BELIEFS && entry.beliefSystemId === undefined) {
      return false;
    }
    const text = searchableText(entry).toLowerCase();
    // eslint-disable-next-line code-architecture/no-unasserted-return -- String.includes is a built-in boolean predicate; combined filter behavior is covered by screen tests.
    return query === '' || text.includes(query);
  });
  assert(filtered.length <= entries.length, 'Filtering must not add history entries.');
  assert(filtered.every((entry) => entries.includes(entry)), 'Filtering must preserve entry identity.');
  return filtered;
}
