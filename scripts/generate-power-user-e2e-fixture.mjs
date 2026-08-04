import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const archivePath = join(
  process.cwd(),
  '.maestro',
  'fixtures',
  'youmotion-power-user-backup-v2-redacted.json',
);
const checkInCount = 133;
const builtInBeliefIds = [
  'always-functioning',
  'no-mistakes',
  'responsible-for-everything',
  'do-everything-alone',
  'perfect-everything',
  'there-for-others',
  'perfect-expect-others',
  'love-requires-conformity',
  'always-considerate',
  'must-adapt',
  'loved-by-everyone',
  'cannot-burden-others',
];
const customBeliefIds = [
  'custom-e2e-power-user-001',
  'custom-e2e-power-user-002',
  'custom-e2e-power-user-003',
];
const noteTemplates = [
  'I paused before reacting and noticed how the feeling changed.',
  'A short walk made the situation easier to understand.',
  'Naming the feeling created enough room to choose the next step.',
  'The body signal arrived first; the explanation became clearer later.',
  'A quiet conversation helped separate the facts from the assumptions.',
  'I wrote down one small action that felt possible today.',
];
const emotionIds = ['freude', 'liebe', 'scham', 'ekel', 'trauer', 'wut', 'furcht'];

const beliefStatements = [
  ...builtInBeliefIds.map((beliefSystemId, index) => ({
    kind: 'built-in',
    beliefSystemId,
    guidingStatement: `Synthetic guiding belief ${String(index + 1).padStart(2, '0')}: I can respond with patience and flexibility.`,
  })),
  ...customBeliefIds.map((beliefSystemId, index) => ({
    kind: 'custom',
    beliefSystemId,
    harmfulStatement: `Synthetic limiting belief ${String(index + 1).padStart(2, '0')}: I must solve every uncertainty immediately.`,
    guidingStatement: `Synthetic custom guidance ${String(index + 1).padStart(2, '0')}: I can take one thoughtful step at a time.`,
  })),
];
const beliefSystemIds = beliefStatements.map(({ beliefSystemId }) => beliefSystemId);

function syntheticTimestamp(index) {
  const base = Date.UTC(2025, 0, 1, 8, 0, 0);
  const regularSpacing = index * 3 * 60 * 60 * 1000;
  const variedMinutes = (index % 6) * 7 * 60 * 1000;
  return base + regularSpacing + variedMinutes;
}

function syntheticCheckIn(index) {
  const position = index + 1;
  const createdAtMilliseconds = syntheticTimestamp(index);
  const occurrenceOffset = ((index % 7) * 11 * 60 * 1000)
    + (index % 17 === 0 ? 12 * 60 * 60 * 1000 : 0);
  const statement = beliefStatements[index % beliefStatements.length];
  const hasBelief = index % 5 !== 0;
  const hasGuidingSnapshot = hasBelief && index % 3 === 0;
  const checkIn = {
    id: `e2e-power-user-moment-${String(position).padStart(3, '0')}`,
    createdAt: new Date(createdAtMilliseconds).toISOString(),
    occurredAt: new Date(createdAtMilliseconds - occurrenceOffset).toISOString(),
    emotionId: emotionIds[index % emotionIds.length],
    intensity: ((index % 10) + 1) / 10,
    level: index % 5,
    note: position % 11 === 0
      ? ''
      : `Synthetic power-user reflection ${String(position).padStart(3, '0')}: ${noteTemplates[index % noteTemplates.length]}`,
  };
  if (hasBelief) checkIn.beliefSystemId = beliefSystemIds[index % beliefSystemIds.length];
  if (hasGuidingSnapshot && statement) {
    checkIn.guidingStatementSnapshot = statement.guidingStatement;
  }
  return checkIn;
}

const archive = {
  version: 2,
  exportedAt: '2025-02-01T12:00:00.000Z',
  checkIns: Array.from({ length: checkInCount }, (_value, index) => syntheticCheckIn(index)),
  beliefStatements,
  settings: {
    locale: 'en-US',
    emotionLabelMode: 'both',
    onboardingCompleted: true,
  },
};

mkdirSync(dirname(archivePath), { recursive: true });
writeFileSync(archivePath, `${JSON.stringify(archive, null, 2)}\n`, 'utf8');
process.stdout.write(`${archivePath}\n`);
