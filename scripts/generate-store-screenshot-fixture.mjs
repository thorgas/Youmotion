import { writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const fixturePath = new URL(
  '../src/features/data-safety/__tests__/fixtures/legacy-archive.fixture.json',
  import.meta.url,
);

const require = createRequire(import.meta.url);
const archive = require(fileURLToPath(fixturePath));
const emotionTotals = {
  freude: 34,
  liebe: 25,
  trauer: 23,
  furcht: 19,
  wut: 14,
  scham: 10,
  ekel: 8,
};
const gapsInHours = [5, 8, 11, 17, 22, 29, 37, 49, 63, 78];
const intensityCenters = {
  freude: 0.57,
  liebe: 0.65,
  trauer: 0.52,
  furcht: 0.46,
  wut: 0.7,
  scham: 0.38,
  ekel: 0.43,
};

let randomState = 0x59_6f_75_6d;
const random = () => {
  randomState = (Math.imul(randomState, 1_664_525) + 1_013_904_223) >>> 0;
  return randomState / 2 ** 32;
};

const emotions = Object.entries(emotionTotals).flatMap(([emotion, count]) => (
  Array.from({ length: count }, () => emotion)
));
for (let index = emotions.length - 1; index > 0; index -= 1) {
  const swapIndex = Math.floor(random() * (index + 1));
  [emotions[index], emotions[swapIndex]] = [emotions[swapIndex], emotions[index]];
}

let occurredAt = Date.parse('2026-09-07T18:43:00.000Z');
let previousEmotion = '';
let repeatedEmotionCount = 0;

const checkIns = Array.from({ length: 133 }, (_, index) => {
  let emotionId = emotions[index];
  if (emotionId === previousEmotion && repeatedEmotionCount >= 2) {
    const swapIndex = emotions.findIndex((emotion, candidateIndex) => (
      candidateIndex > index && emotion !== previousEmotion
    ));
    if (swapIndex !== -1) {
      [emotions[index], emotions[swapIndex]] = [emotions[swapIndex], emotions[index]];
      emotionId = emotions[index];
    }
  }
  repeatedEmotionCount = emotionId === previousEmotion ? repeatedEmotionCount + 1 : 1;
  previousEmotion = emotionId;

  const center = intensityCenters[emotionId];
  const intensity = Math.min(0.94, Math.max(0.12, center + (random() - 0.5) * 0.58));
  const roundedIntensity = Math.round(intensity * 100) / 100;
  const createdAt = new Date(occurredAt).toISOString().replace('.000Z', 'Z');
  const id = `${occurredAt}-${index.toString(16).padStart(13, '0')}`;
  const level = roundedIntensity < 0.4 ? 1 : roundedIntensity < 0.7 ? 2 : 3;

  const gap = gapsInHours[Math.floor(random() * gapsInHours.length)];
  const minuteJitter = 7 + Math.floor(random() * 47);
  occurredAt -= (gap * 60 + minuteJitter) * 60 * 1000;

  return { id, createdAt, emotionId, intensity: roundedIntensity, level, note: '' };
});

const nextArchive = {
  ...archive,
  exportedAt: '2026-09-07T19:00:00.000Z',
  checkIns,
};

await writeFile(fixturePath, `${JSON.stringify(nextArchive, null, 2)}\n`);
