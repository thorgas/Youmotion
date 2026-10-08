/* oxlint-disable architecture/no-multiple-function-params -- Fixtures implement the injected command/argv and path/record interfaces; assertions prove the boundary contract. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { coordinateProductionBuilds } from './release-production-builds.mjs';

const source = 'a'.repeat(40);
const projectId = '7f37690f-c632-408c-a4ab-1b240610bd12';
const ids = { ios: '11111111-1111-1111-1111-111111111111', android: '22222222-2222-2222-2222-222222222222' };
function build(platform, changes = {}) {
  return { id: ids[platform], platform: platform.toUpperCase(), status: 'IN_QUEUE', gitCommitHash: source,
    appVersion: '1.0.6', project: { id: projectId }, buildProfile: 'production', channel: 'production', distribution: 'STORE', isForIosSimulator: false, ...changes };
}
function fixture({ existing = [], failure, dirty = '', env = {}, mode, requestedSource } = {}) {
  const calls = [];
  const saves = [];
  const run = async (command, args) => {
    const key = args.join(' ');
    calls.push([command, ...args]);
    if (failure && key.includes(failure)) throw new Error('GraphQL failed');
    if (key === 'rev-parse HEAD') return source;
    if (key === 'status --porcelain') return dirty;
    if (key.startsWith('show ')) return read(args[1].split(':')[1]);
    if (key.includes('build:list')) return JSON.stringify(existing);
    if (key.includes('build:view')) return JSON.stringify(existing.find((value) => value.id === args[3]) ?? build(args[3] === ids.ios ? 'ios' : 'android'));
    if (key.includes('eas build ')) {
      const platform = args[args.indexOf('--platform') + 1];
      return JSON.stringify((platform === 'all' ? ['ios', 'android'] : [platform]).map((value) => build(value)));
    }
    return '';
  };
  const read = async (path) => JSON.stringify(path === 'eas.json'
    ? { build: { production: { environment: 'production', channel: 'production' } } }
    : path === 'package.json' ? { devDependencies: { 'eas-cli': '21.0.0' } }
    : path === 'app.json'
    ? { expo: { version: '1.0.6', extra: { eas: { projectId } } } }
    : { apple: { version: '1.0.6' } });
  return { calls, saves, execute: (changes = {}) => coordinateProductionBuilds({ run, read, env, mode, requestedSource,
    save: async (path, record) => saves.push([path, record]), ...changes }) };
}
test('check validates without cloud discovery or build', async () => {
  const f = fixture({ mode: 'check' });
  assert.equal((await f.execute()).checked, true);
  assert.equal(f.calls.filter((call) => call.includes('eas')).length, 0);
});
test('reuses queued and finished matching jobs without verification or creation', async () => {
  const f = fixture({ existing: [build('ios'), build('android', { status: 'FINISHED' })] });
  assert.equal((await f.execute()).builds.length, 2);
  assert.equal(f.calls.some((call) => call.includes('verify') || call.includes('build')), false);
  assert.equal(f.calls.filter((call) => call.includes('build:view')).length, 2);
});
test('creates only missing Android after checks and persists intent first', async () => {
  const f = fixture({ existing: [build('ios')] });
  await f.execute();
  assert.deepEqual(f.calls.find((call) => call.includes('build')).slice(-7), ['--platform', 'android', '--profile', 'production', '--non-interactive', '--no-wait', '--json'].slice(-8));
  assert.ok(f.calls.some((call) => call.includes('verify')));
  assert.ok(f.calls.some((call) => call.includes('test:coverage')));
  assert.ok(f.saves.some(([, value]) => value.attempt?.state === 'launch-requested'));
});
test('GraphQL discovery failure never launches or reports success', async () => {
  const f = fixture({ failure: 'build:list' });
  await assert.rejects(f.execute(), /GraphQL/);
  assert.equal(f.calls.some((call) => call.includes('build')), false);
});
test('failed launch preserves unknown outcome and does not invent build IDs', async () => {
  const f = fixture({ failure: 'eas build ' });
  await assert.rejects(f.execute(), /outcome is unknown/);
  assert.equal(f.saves.at(-1)[1].attempt.state, 'unknown');
});
test('readback failure cannot produce confirmed summary', async () => {
  const f = fixture({ existing: [build('ios'), build('android')], failure: 'build:view' });
  await assert.rejects(f.execute(), /GraphQL/);
});
for (const changes of [{ gitCommitHash: 'b'.repeat(40) }, { buildProfile: 'preview' }, { appVersion: '1.0.5' }, { channel: 'testing' }, { status: 'ERRORED' }, { isForIosSimulator: true }]) {
  test(`rejects mismatched build ${JSON.stringify(changes)}`, async () => {
    await assert.rejects(fixture({ existing: [build('ios', changes)] }).execute());
  });
}
test('duplicate active jobs block another launch', async () => {
  const f = fixture({ existing: [build('ios'), build('ios', { id: ids.android })] });
  await assert.rejects(f.execute(), /Multiple production/);
  assert.equal(f.calls.some((call) => call.includes('build')), false);
});
test('production contamination and dirty source reject before build', async () => {
  await assert.rejects(fixture({ env: { EXPO_PUBLIC_E2E: 'true' } }).execute(), /Remove/);
  await assert.rejects(fixture({ dirty: '?? accidental.env' }).execute(), /clean/);
});
test('status missing job never creates it', async () => {
  const f = fixture({ mode: 'status', existing: [build('ios')] });
  await assert.rejects(f.execute(), /No production job/);
  assert.equal(f.calls.some((call) => call.includes('build')), false);
});

test('single-platform target reads only selected contract without creating missing other platform', async () => {
  const f = fixture({ existing: [build('ios')] });
  const result = await f.execute({ targetPlatform: 'ios' });
  assert.equal(result.builds.length, 1);
  assert.equal(f.calls.some((call) => call.includes('build')), false);
});
test('earlier source is accepted only for status', async () => {
  const older = 'b'.repeat(40);
  const f = fixture({ mode: 'status', existing: [build('ios', { gitCommitHash: older }), build('android', { gitCommitHash: older })] });
  assert.equal((await f.execute({ requestedSource: older })).source, older);
  assert.equal(f.calls.some((call) => call.includes('build')), false);
  await assert.rejects(fixture().execute({ requestedSource: older }), /current HEAD/);
});
test('unknown previous launch cannot trigger a duplicate retry', async () => {
  const f = fixture();
  await assert.rejects(f.execute({ read: async (path) => {
    if (path.startsWith('artifacts/')) return JSON.stringify({ attempt: { state: 'unknown' } });
    if (path === 'eas.json') return JSON.stringify({ build: { production: { environment: 'production', channel: 'production' } } });
    if (path === 'package.json') return JSON.stringify({ devDependencies: { 'eas-cli': '21.0.0' } });
    if (path === 'app.json') return JSON.stringify({ expo: { version: '1.0.6', extra: { eas: { projectId } } } });
    return JSON.stringify({ apple: { version: '1.0.6' } });
  } }), /unknown outcome/);
  assert.equal(f.calls.some((call) => call.includes('build')), false);
});

test('interrupted launch intent blocks duplicate launch until EAS reconciles it', async () => {
  const f = fixture();
  await assert.rejects(f.execute({ read: async (path) => {
    if (path.startsWith('artifacts/')) return JSON.stringify({ attempt: { state: 'launch-requested' } });
    if (path === 'eas.json') return JSON.stringify({ build: { production: { environment: 'production', channel: 'production' } } });
    if (path === 'package.json') return JSON.stringify({ devDependencies: { 'eas-cli': '21.0.0' } });
    if (path === 'app.json') return JSON.stringify({ expo: { version: '1.0.6', extra: { eas: { projectId } } } });
    return JSON.stringify({ apple: { version: '1.0.6' } });
  } }), /unknown outcome/);
  assert.equal(f.calls.some((call) => call.includes('build')), false);
});

for (const launched of [[], [build('ios')]]) {
  test(`incomplete launch response retains unknown intent: ${launched.length} jobs`, async () => {
    const f = fixture();
    const originalRunCalls = [];
    await assert.rejects(f.execute({ run: async (command, args) => {
      originalRunCalls.push([command, ...args]);
      if (args.join(' ') === 'rev-parse HEAD') return source;
      if (args.includes('build:list')) return '[]';
      if (args.includes('build')) return JSON.stringify(launched);
      return '';
    } }), /outcome is unknown/);
    assert.equal(f.saves.at(-1)[1].attempt.state, 'unknown');
    assert.equal(originalRunCalls.some((call) => call.includes('build:view')), false);
  });
}
test('missing native-simulator flag fails the build boundary', async () => {
  await assert.rejects(fixture({ existing: [build('ios', { isForIosSimulator: undefined })] }).execute(), /contract/);
});
