import { execFile, spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const executeFile = promisify(execFile);
const projectRoot = process.cwd();
const androidHome = process.env.ANDROID_HOME
  ?? join(homedir(), 'Library', 'Android', 'sdk');
const adb = join(androidHome, 'platform-tools', 'adb');
const appId = 'com.youmotion.mobile';
const fixtureName = 'youmotion-power-user-backup-v2-redacted.json';
const fixture = join(projectRoot, '.maestro', 'fixtures', fixtureName);
const maestroSuite = join(projectRoot, '.maestro');
const artifactDirectory = join(projectRoot, 'artifacts', 'maestro');
const deviceFixture = `/sdcard/Download/${fixtureName}`;

async function capture({ command, arguments_ }) {
  const { stdout, stderr } = await executeFile(command, arguments_, { timeout: 60_000 });
  return `${stdout}${stderr}`.trim();
}

function run({ arguments_, platform }) {
  return new Promise((...promiseControls) => {
    const [resolve, reject] = promiseControls;
    const child = spawn('maestro', arguments_, { cwd: projectRoot, stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (...exit) => {
      const [code, signal] = exit;
      if (signal) {
        reject(new Error(`Maestro ${platform} suite stopped with signal ${signal}.`));
        return;
      }
      if (code !== 0) {
        reject(new Error(`Maestro ${platform} suite exited with code ${String(code)}.`));
        return;
      }
      resolve();
    });
  });
}

async function connectedEmulators() {
  if (!existsSync(adb)) return [];
  const output = await capture({ command: adb, arguments_: ['devices'] });
  return output
    .split('\n')
    .slice(1)
    .map((line) => line.trim().split(/\s+/))
    .filter((parts) => parts[1] === 'device')
    .map((parts) => parts[0])
    .filter((deviceId) => deviceId?.startsWith('emulator-'));
}

async function bootedIosSimulators() {
  if (process.platform !== 'darwin') return [];
  const output = await capture({
    command: 'xcrun',
    arguments_: ['simctl', 'list', 'devices', 'booted', '--json'],
  });
  const parsed = JSON.parse(output);
  return Object.values(parsed.devices ?? {})
    .flat()
    .filter((device) => device?.state === 'Booted')
    .map((device) => device.udid)
    .filter((udid) => typeof udid === 'string');
}

function selectedDevice({ candidates, configured, platform, variable }) {
  if (configured !== undefined) {
    if (!candidates.includes(configured)) {
      throw new Error(`${variable} does not identify a booted ${platform} test device.`);
    }
    return configured;
  }
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];
  throw new Error(`Set ${variable}; more than one ${platform} test device is booted.`);
}

async function runIosSuite(deviceId) {
  await run({
    platform: 'iOS',
    arguments_: [
      '--udid',
      deviceId,
      'test',
      maestroSuite,
      '--exclude-tags=android-only',
      '--format',
      'JUNIT',
      '--output',
      join(artifactDirectory, 'ios-e2e.xml'),
    ],
  });
}

async function removeDeviceFixture(deviceId) {
  await capture({
    command: adb,
    arguments_: ['-s', deviceId, 'shell', 'rm', '-f', deviceFixture],
  });
}

async function runAndroidSuite(deviceId) {
  if (process.env.E2E_ALLOW_DATA_REPLACEMENT !== 'true') {
    throw new Error(
      'Set E2E_ALLOW_DATA_REPLACEMENT=true because the Android suite replaces app data on its emulator.',
    );
  }
  const installed = await capture({
    command: adb,
    arguments_: ['-s', deviceId, 'shell', 'pm', 'path', appId],
  });
  if (!installed.startsWith('package:')) {
    throw new Error(`Install ${appId} on ${deviceId} before running this test.`);
  }
  await capture({
    command: adb,
    arguments_: ['-s', deviceId, 'reverse', 'tcp:8082', 'tcp:8082'],
  });
  await capture({
    command: adb,
    arguments_: ['-s', deviceId, 'push', fixture, deviceFixture],
  });
  try {
    await run({
      platform: 'Android',
      arguments_: [
        '--udid',
        deviceId,
        'test',
        maestroSuite,
        '--format',
        'JUNIT',
        '--output',
        join(artifactDirectory, 'android-e2e.xml'),
      ],
    });
  } finally {
    await removeDeviceFixture(deviceId);
  }
}

async function main() {
  if (!existsSync(fixture)) throw new Error(`Fixture was not found at ${fixture}.`);
  if (!existsSync(maestroSuite)) throw new Error(`Maestro suite was not found at ${maestroSuite}.`);
  const [androidCandidates, iosCandidates] = await Promise.all([
    connectedEmulators(),
    bootedIosSimulators(),
  ]);
  const androidDevice = selectedDevice({
    candidates: androidCandidates,
    configured: process.env.ANDROID_SERIAL,
    platform: 'Android emulator',
    variable: 'ANDROID_SERIAL',
  });
  const iosDevice = selectedDevice({
    candidates: iosCandidates,
    configured: process.env.IOS_SIMULATOR_UDID,
    platform: 'iOS simulator',
    variable: 'IOS_SIMULATOR_UDID',
  });
  if (androidDevice === null && iosDevice === null) {
    throw new Error('Boot an iOS simulator, an Android emulator, or one of each.');
  }
  mkdirSync(artifactDirectory, { recursive: true });
  if (iosDevice !== null) await runIosSuite(iosDevice);
  if (androidDevice !== null) await runAndroidSuite(androidDevice);
}

await main();
