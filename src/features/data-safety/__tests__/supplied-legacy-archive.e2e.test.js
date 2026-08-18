import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import {
  DATA_ARCHIVE_VERSION,
  DataArchiveFromJson,
  currentDataArchive,
} from '../domain/data-archive';

const committedArchivePath = join(__dirname, 'fixtures', 'legacy-archive.fixture.json');
const suppliedArchivePath = process.env['YOUMOTION_LEGACY_ARCHIVE_PATH'] ?? committedArchivePath;

describe('legacy archive fixture', () => {
  it('upgrades all 133 moments and keeps every guiding belief', async () => {
    const contents = await readFile(suppliedArchivePath, 'utf8');
    const persistedArchive = await Effect.runPromise(
      Schema.decodeUnknown(DataArchiveFromJson)(contents),
    );
    const archive = currentDataArchive(persistedArchive);
    const encoded = await Effect.runPromise(Schema.encode(DataArchiveFromJson)(archive));
    const roundTripped = currentDataArchive(await Effect.runPromise(
      Schema.decodeUnknown(DataArchiveFromJson)(encoded),
    ));

    expect(persistedArchive.version).toBe(1);
    expect(archive.version).toBe(DATA_ARCHIVE_VERSION);
    expect(archive.checkIns).toHaveLength(133);
    expect(archive.checkIns.every((checkIn) => checkIn.occurredAt === checkIn.createdAt)).toBe(true);
    expect(roundTripped).toEqual(archive);
  });

  it('covers both belief kinds so guiding-belief management has suggested and authored rows', async () => {
    const contents = await readFile(committedArchivePath, 'utf8');
    const archive = currentDataArchive(await Effect.runPromise(
      Schema.decodeUnknown(DataArchiveFromJson)(contents),
    ));
    const suggested = archive.beliefStatements.filter(
      (statement) => statement.kind === 'built-in',
    );
    const authored = archive.beliefStatements.filter(
      (statement) => statement.kind === 'custom',
    );

    expect(archive.beliefStatements).toHaveLength(15);
    expect(suggested).toHaveLength(12);
    expect(authored).toHaveLength(3);
    expect(archive.beliefStatements.every(
      (statement) => statement.guidingStatement !== undefined,
    )).toBe(true);
  });
});
