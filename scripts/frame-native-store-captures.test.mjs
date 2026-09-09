import assert from 'node:assert/strict';
import test from 'node:test';
import { buildRenderPlan, parseArguments } from './frame-native-store-captures.mjs';

test('maps native agent-device captures to isolated phone render cells', () => {
  const plan = buildRenderPlan({ root: '/repo', output: 'goldie/out/native-frame', platform: 'all', locale: 'all' });
  assert.equal(plan.length, 4);
  assert.deepEqual(plan.map(({ platform, locale, device }) => ({ platform, locale, device })), [
    { platform: 'ios', locale: 'en-US', device: 'iphone-6.9' },
    { platform: 'ios', locale: 'de-DE', device: 'iphone-6.9' },
    { platform: 'android', locale: 'en-US', device: 'pixel-10-pro' },
    { platform: 'android', locale: 'de-DE', device: 'pixel-10-pro' },
  ]);
  assert.equal(plan[0].files[0].path, '/repo/goldie/out/agent-device/ios/en-US/iphone-6.9/pulse.png');
  assert.equal(plan[2].files[0].path, '/repo/goldie/out/agent-device/android/en/phone/pulse.png');
  assert.equal(plan[3].files[4].path, '/repo/goldie/out/agent-device/android/de/phone/settings-data.png');
  assert.ok(plan.every(({ output }) => output.includes('/native-frame/')));
  assert.ok(plan.every(({ files }) => files.length === 5));
});

test('parses explicit renderer filters', () => {
  assert.deepEqual(parseArguments(['--platform', 'ios', '--locale', 'de-DE', '--output', 'tmp/render']), {
    output: 'tmp/render',
    platform: 'ios',
    locale: 'de-DE',
    root: process.cwd(),
  });
});
