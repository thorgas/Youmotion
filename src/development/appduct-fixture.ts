import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import assert from '@/assert';
import { PersistedDataArchiveSchema, currentDataArchive } from '@/features/data-safety/domain/data-archive';
import { restoreDataArchive } from '@/features/data-safety/infrastructure/data-archive.repository';

export const FixtureToolResultSchema = Schema.Struct({ moments: Schema.Number, beliefs: Schema.Number });
export const FixtureToolInputSchema = Schema.Struct({ archive: PersistedDataArchiveSchema });

export async function seedArchiveFixture(input: unknown) {
  const decoded = await Effect.runPromise(Schema.decodeUnknown(FixtureToolInputSchema)(input));
  const archive = currentDataArchive(decoded.archive);
  assert(archive.checkIns.length === 133, 'E2E fixture must contain the committed 133 synthetic moments.');
  assert(archive.beliefStatements.length === 15, 'E2E fixture must contain the committed 15 guiding beliefs.');
  await Effect.runPromise(restoreDataArchive(archive));
  return { moments: archive.checkIns.length, beliefs: archive.beliefStatements.length };
}
