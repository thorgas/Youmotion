import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { HISTORY_CONTENT_FILTERS } from '@/constants';
import { PersistedDataArchiveSchema, currentDataArchive } from '@/features/data-safety/domain/data-archive';
import legacyArchive from '@/features/data-safety/__tests__/fixtures/legacy-archive.fixture.json';
import { filterHistoryEntries } from '../application/history-filter';

it.each([
  ['ÄRGER über ÖL und ÜBERRASCHUNG', '  ärger ÜBER öl  '],
  ['A QUIET Moment', '  quiet MOMENT  '],
])('matches recorded note %s with query %s', async (note, query) => {
  const archive = currentDataArchive(await Effect.runPromise(Schema.decodeUnknown(PersistedDataArchiveSchema)(legacyArchive)));
  const entries = archive.checkIns.map((entry, index) => Object.assign({}, entry, { note: index === 0 ? note : 'synthetic unrelated entry' }));
  const result = filterHistoryEntries({
    entries,
    filters: { beliefSystemId: null, emotionId: null, content: HISTORY_CONTENT_FILTERS.ALL, query },
    searchableText: (entry) => entry.note,
  });
  expect(result).toHaveLength(1);
  expect(result[0]).toBe(entries[0]);
});
