import assert from 'node:assert/strict';
import test from 'node:test';
import { buildRenderPlan, parseArguments, presentationOverrides } from './frame-native-store-captures.mjs';

test('renders committed inputs without relying on ignored capture directories', () => {
  const options = parseArguments(['--input-root', 'store/review-2026-09-09/native']);
  const plan = buildRenderPlan(options);
  assert.ok(plan.every(({ files }) => files.every(({ path }) => path.includes('/store/review-2026-09-09/native/'))));
  assert.ok(plan[2].files[0].path.endsWith('/android/en-US/phone/pulse.png'));
  assert.ok(plan[1].files[2].path.endsWith('/ios/de-DE/iphone-6.9/insights-chart-full.png'));
});

test('keeps all screens inside the canvas and preserves Android status-bar corners', () => {
  const ios = presentationOverrides({ platform: 'ios' });
  assert.deepEqual(ios.theme, { template: 'uniform', layout: 'classic', copyHeightRatio: 0.27, deviceWidthRatio: 0.84, screenOnly: false });
  const android = presentationOverrides({ platform: 'android', files: [{ path: '/native.png' }] });
  assert.equal(android.theme.screenOnly, true);
  assert.equal(android.android.frame.screenRadius, 0);
  assert.deepEqual(android.android.frame.screen, { x: 0, y: 0, width: 1280, height: 2856 });
});

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
