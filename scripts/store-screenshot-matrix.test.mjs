import assert from 'node:assert/strict';
import { access, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { createCapturePlan, parseArguments, runCaptureItem } from './store-screenshot-matrix.mjs';

test('parses filters and dry-run', () => {
  assert.deepEqual(parseArguments(['--', '--platform', 'ios', '--locale', 'de-DE', '--scene', 'settings', '--dry-run']), {
    config: 'store/screenshots/pipeline.config.json',
    dryRun: true,
    locale: 'de-DE',
    platform: 'ios',
    scene: 'settings',
  });
});

test('builds an independent platform, locale, and scene matrix', async () => {
  const root = await mkdtemp(join(tmpdir(), 'store-screenshots-'));
  await mkdir(join(root, 'goldie'));
  await writeFile(join(root, 'goldie', 'ios.ts'), 'export default {};\n');
  await mkdir(join(root, 'release.app'));
  await writeFile(join(root, 'release.app', 'Info.plist'), 'artifact');
  process.env.TEST_SCREENSHOT_ARTIFACT = join(root, 'release.app');
  const plan = createCapturePlan({
    config: {
      schemaVersion: 1,
      command: ['goldie', 'all'],
      locales: ['en-US', 'de-DE'],
      scenes: ['pulse', 'settings'],
      platforms: {
        ios: { artifactEnv: 'TEST_SCREENSHOT_ARTIFACT', goldieConfig: 'goldie/ios.ts' },
      },
    },
    options: parseArguments([]),
    repositoryRoot: root,
  });
  delete process.env.TEST_SCREENSHOT_ARTIFACT;

  assert.deepEqual(plan.map(({ locale, platform, scene }) => ({ locale, platform, scene })), [
    { locale: 'en-US', platform: 'ios', scene: 'pulse' },
    { locale: 'en-US', platform: 'ios', scene: 'settings' },
    { locale: 'de-DE', platform: 'ios', scene: 'pulse' },
    { locale: 'de-DE', platform: 'ios', scene: 'settings' },
  ]);
  assert.equal(new Set(plan.map(({ outputDirectory }) => outputDirectory)).size, plan.length);
  assert.ok(plan.every(({ outputDirectory }) => outputDirectory.startsWith(join(root, 'goldie', 'out', '.matrix'))));
});

test('rejects unknown matrix values', async () => {
  const root = await mkdtemp(join(tmpdir(), 'store-screenshots-'));
  await mkdir(join(root, 'goldie'));
  await writeFile(join(root, 'goldie', 'ios.ts'), 'export default {};\n');
  await writeFile(join(root, 'release.app'), 'artifact');
  process.env.TEST_SCREENSHOT_ARTIFACT = join(root, 'release.app');
  assert.throws(() => createCapturePlan({
    config: {
      schemaVersion: 1,
      command: ['goldie', 'all'],
      locales: ['en-US'],
      scenes: ['pulse'],
      platforms: {
        ios: { artifactEnv: 'TEST_SCREENSHOT_ARTIFACT', goldieConfig: 'goldie/ios.ts' },
      },
    },
    options: { ...parseArguments([]), scene: 'missing' },
    repositoryRoot: root,
  }), /Unknown scene: missing/);
  delete process.env.TEST_SCREENSHOT_ARTIFACT;
});

test('keeps raw and rendered output isolated for every capture cell', async () => {
  const root = await mkdtemp(join(tmpdir(), 'store-screenshots-'));
  const artifactPath = join(root, 'release.app');
  const goldieConfig = join(root, 'goldie.ts');
  const command = join(root, 'fake-capture.mjs');
  await writeFile(artifactPath, 'artifact');
  await writeFile(goldieConfig, 'export default {};\n');
  await writeFile(command, `import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
const root = dirname(process.env.GOLDIE_CONFIG);
const raw = join(root, 'out', 'raw', process.env.GOLDIE_LOCALE, process.env.GOLDIE_SCENE + '.txt');
const rendered = join(root, 'out', 'screenshots', 'fake', process.env.GOLDIE_LOCALE, process.env.GOLDIE_SCENE + '.png');
await mkdir(dirname(raw), { recursive: true });
await mkdir(dirname(rendered), { recursive: true });
await writeFile(raw, 'raw');
await writeFile(rendered, process.env.GOLDIE_SCENE);
`);
  const base = { artifactEnv: 'TEST_ARTIFACT', artifactPath, goldieConfig, platform: 'ios' };
  const items = ['pulse', 'settings'].map((scene) => Object.assign({}, base, { locale: 'en-US', outputDirectory: join(root, 'goldie', 'out', '.matrix', 'ios', 'en-US', scene), scene }));
  const config = { command: ['node', command] };
  const results = [];
  async function captureNext(index) {
    if (index >= items.length) return;
    results.push(await runCaptureItem({ config, item: items[index], repositoryRoot: root }));
    return captureNext(index + 1);
  }
  await captureNext(0);

  assert.equal(new Set(results.map(({ isolatedDirectory }) => isolatedDirectory)).size, 2);
  await Promise.all(results.map(async (result, index) => {
    const scene = items[index].scene;
    await Promise.all([
      access(join(result.isolatedDirectory, 'out', 'raw', 'en-US', `${scene}.txt`)),
      access(join(result.isolatedDirectory, 'out', 'screenshots', 'fake', 'en-US', `${scene}.png`)),
    ]);
    assert.equal(await readFile(join(root, 'goldie', 'out', 'screenshots', 'fake', 'en-US', `${scene}.png`), 'utf8'), scene);
  }));
});
