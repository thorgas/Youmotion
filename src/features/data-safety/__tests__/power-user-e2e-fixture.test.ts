import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import fixture from '../../../../.maestro/fixtures/youmotion-power-user-backup-v2-redacted.json';
import { EMOTION_IDS } from '@/constants';
import {
  DATA_ARCHIVE_VERSION,
  DataArchiveFromJson,
  currentDataArchive,
} from '../domain/data-archive';

describe('redacted power-user E2E archive', () => {
  it('is a synthetic current-schema archive with realistic scale and relationships', async () => {
    const contents = JSON.stringify(fixture);
    const persisted = await Effect.runPromise(
      Schema.decodeUnknown(DataArchiveFromJson)(contents),
    );
    const archive = currentDataArchive(persisted);
    const statementIds = new Set(
      archive.beliefStatements.map(({ beliefSystemId }) => beliefSystemId),
    );
    const referencedStatementIds = archive.checkIns.flatMap(({ beliefSystemId }) => (
      beliefSystemId === undefined ? [] : [beliefSystemId]
    ));
    const textValues = [
      ...archive.checkIns.flatMap(({ guidingStatementSnapshot, note }) => (
        guidingStatementSnapshot === undefined ? [note] : [note, guidingStatementSnapshot]
      )),
      ...archive.beliefStatements.flatMap((statement) => (
        statement.kind === 'custom'
          ? [statement.harmfulStatement, statement.guidingStatement ?? '']
          : [statement.guidingStatement]
      )),
    ].filter((value) => value !== '');

    expect(persisted.version).toBe(DATA_ARCHIVE_VERSION);
    expect(archive.checkIns).toHaveLength(133);
    expect(archive.beliefStatements).toHaveLength(15);
    expect(new Set(archive.checkIns.map(({ id }) => id))).toHaveProperty('size', 133);
    expect(new Set(archive.checkIns.map(({ emotionId }) => emotionId))).toEqual(
      new Set(Object.values(EMOTION_IDS)),
    );
    expect(archive.checkIns.every(({ occurredAt }) => occurredAt.length > 0)).toBe(true);
    expect(archive.checkIns.some(({ createdAt, occurredAt }) => createdAt !== occurredAt)).toBe(true);
    expect(referencedStatementIds.every((id) => statementIds.has(id))).toBe(true);
    expect(textValues.every((value) => value.startsWith('Synthetic'))).toBe(true);
    expect(contents).not.toContain('2026-');
  });
});
