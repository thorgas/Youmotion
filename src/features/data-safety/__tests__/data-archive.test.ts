import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import {
  APP_LOCALES,
  EMOTION_IDS,
  EMOTION_LABEL_MODES,
} from '@/constants';
import {
  DATA_ARCHIVE_VERSION,
  DataArchiveFromJson,
  DataArchiveSchema,
  DataArchiveTimestamp,
  currentDataArchive,
  dataArchiveSummary,
} from '../domain/data-archive';
import { CheckInId, CheckInTimestamp } from '@/features/check-in/domain/check-in';

const archive = DataArchiveSchema.make({
  version: DATA_ARCHIVE_VERSION,
  exportedAt: DataArchiveTimestamp.make('2026-08-02T08:00:00.000Z'),
  checkIns: [{
    id: CheckInId.make('moment-1'),
    createdAt: CheckInTimestamp.make('2026-08-01T18:00:00.000Z'),
    occurredAt: CheckInTimestamp.make('2026-08-01T18:00:00.000Z'),
    emotionId: EMOTION_IDS.JOY,
    intensity: 0.6,
    level: 3,
    note: 'A quiet evening.',
  }],
  beliefStatements: [],
  settings: {
    locale: APP_LOCALES.ENGLISH,
    emotionLabelMode: EMOTION_LABEL_MODES.BOTH,
    onboardingCompleted: true,
  },
});

describe('data archive schema', () => {
  it('round-trips the complete versioned archive through JSON', async () => {
    const encoded = await Effect.runPromise(Schema.encode(DataArchiveFromJson)(archive));
    const decoded = await Effect.runPromise(Schema.decodeUnknown(DataArchiveFromJson)(encoded));

    expect(decoded).toEqual(archive);
    expect(dataArchiveSummary(currentDataArchive(decoded))).toEqual({
      exportedAt: archive.exportedAt,
      checkInCount: 1,
      beliefStatementCount: 0,
    });
  });

  it('rejects unsupported versions before restore', async () => {
    const result = await Effect.runPromise(Effect.either(
      Schema.decodeUnknown(DataArchiveFromJson)(JSON.stringify({
        ...archive,
        version: 3,
      })),
    ));

    expect(result._tag).toBe('Left');
  });

  it('upgrades version 1 archives by using creation time as occurrence time', async () => {
    const legacy = JSON.stringify({
      ...archive,
      version: 1,
      checkIns: archive.checkIns.map(({ occurredAt: _occurredAt, ...checkIn }) => checkIn),
    });
    const decoded = await Effect.runPromise(Schema.decodeUnknown(DataArchiveFromJson)(legacy));
    const upgraded = currentDataArchive(decoded);

    expect(upgraded.version).toBe(DATA_ARCHIVE_VERSION);
    expect(upgraded.checkIns[0]?.occurredAt).toBe(upgraded.checkIns[0]?.createdAt);
  });

  it('rejects malformed persisted entries before restore', async () => {
    const result = await Effect.runPromise(Effect.either(
      Schema.decodeUnknown(DataArchiveFromJson)(JSON.stringify({
        ...archive,
        checkIns: [{ ...archive.checkIns[0], intensity: 4 }],
      })),
    ));

    expect(result._tag).toBe('Left');
  });
});
