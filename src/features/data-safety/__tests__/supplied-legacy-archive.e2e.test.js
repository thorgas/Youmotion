import { readFile } from 'node:fs/promises';

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import {
  DATA_ARCHIVE_VERSION,
  DataArchiveFromJson,
  currentDataArchive,
} from '../domain/data-archive';

const suppliedArchivePath = process.env['YOUMOTION_LEGACY_ARCHIVE_PATH'];

describe('supplied redacted legacy archive', () => {
  it('upgrades all 133 moments when the external E2E fixture is provided', async () => {
    if (suppliedArchivePath === undefined) return;
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
});
