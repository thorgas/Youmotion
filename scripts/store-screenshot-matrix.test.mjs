import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { createCapturePlan, parseArguments } from './store-screenshot-matrix.mjs';

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
