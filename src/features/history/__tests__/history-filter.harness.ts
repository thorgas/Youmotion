import { describe, expect, test } from 'react-native-harness';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { HISTORY_CONTENT_FILTERS } from '@/constants';
import { PersistedDataArchiveSchema, currentDataArchive } from '@/features/data-safety/domain/data-archive';
import legacyArchive from '@/features/data-safety/__tests__/fixtures/legacy-archive.fixture.json';
import { filterHistoryEntries } from '../application/history-filter';

describe('history search casing in native Hermes', () => {
  test('matches English and German search text without locale-aware casing', async () => {
    const archive = currentDataArchive(await Effect.runPromise(Schema.decodeUnknown(PersistedDataArchiveSchema)(legacyArchive)));
    expect(archive.checkIns).toHaveLength(133);
    for (const { note, query } of [
      { note: 'ÄRGER über ÖL und ÜBERRASCHUNG', query: '  ärger ÜBER öl  ' },
      { note: 'A QUIET Moment', query: '  quiet MOMENT  ' },
    ]) {
      const entries = archive.checkIns.map((entry, index) => Object.assign({}, entry, { note: index === 0 ? note : 'synthetic unrelated entry' }));
      const result = filterHistoryEntries({
        entries,
        filters: { beliefSystemId: null, emotionId: null, content: HISTORY_CONTENT_FILTERS.ALL, query },
        searchableText: (entry) => entry.note,
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(entries[0]);
    }
  });
});
