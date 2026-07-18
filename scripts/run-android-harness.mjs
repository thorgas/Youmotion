import { execFile, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const runner = process.argv[2];
const port = Number(process.argv[3]);
const testArguments = process.argv.slice(4);
const androidHome = process.env.ANDROID_HOME
  ?? join(homedir(), 'Library', 'Android', 'sdk');
const adb = join(androidHome, 'platform-tools', 'adb');
const executeFile = promisify(execFile);
const defaultAndroidAppPath = join(
  process.cwd(),
  'android',
  'app',
  'build',
  'outputs',
  'apk',
  'debug',
  'app-debug.apk',
);
const harnessAppPath = process.env.HARNESS_APP_PATH
  ?? (
    runner === 'android' && existsSync(defaultAndroidAppPath)
      ? defaultAndroidAppPath
      : undefined
  );

if (!runner || !Number.isInteger(port)) {
  throw new Error('An Android Harness runner and Metro port are required.');
}

async function capture({ command, arguments_ }) {
  const { stdout, stderr } = await executeFile(command, arguments_);
  return `${stdout}${stderr}`.trim();
}

async function connectedDeviceIds() {
  const output = await capture({ command: adb, arguments_: ['devices'] });
  return output
    .split('\n')
    .slice(1)
    .map((line) => line.trim().split(/\s+/))
    .filter((parts) => parts[1] === 'device')
    .map((parts) => parts[0])
    .filter((deviceId) => deviceId !== undefined);
}

async function deviceMatchesPixel6a(deviceId) {
  const [manufacturer, model] = await Promise.all([
    capture({
      command: adb,
      arguments_: ['-s', deviceId, 'shell', 'getprop', 'ro.product.manufacturer'],
    }),
    capture({
      command: adb,
      arguments_: ['-s', deviceId, 'shell', 'getprop', 'ro.product.model'],
    }),
  ]);
  return manufacturer === 'Google' && model === 'Pixel 6a';
}

async function selectDevice() {
  const deviceIds = await connectedDeviceIds();
  if (runner !== 'android-pixel-6a') {
    const emulator = deviceIds.find((deviceId) => deviceId.startsWith('emulator-'));
    if (emulator) return emulator;
  }
  const matches = await Promise.all(deviceIds.map(async (deviceId) => ({
    deviceId,
    matches: await deviceMatchesPixel6a(deviceId),
  })));
  const physicalPixel = matches.find((candidate) => candidate.matches)?.deviceId;
  if (physicalPixel) return physicalPixel;
  if (deviceIds.length === 1) return deviceIds[0];
  throw new Error(`No connected device matches the ${runner} Harness runner.`);
}

async function developmentLauncherVisible(deviceId) {
  const activities = await capture({
    command: adb,
    arguments_: [
      '-s',
      deviceId,
      'shell',
      'dumpsys',
      'activity',
      'activities',
    ],
  });
  return activities.includes(
    'com.youmotion.mobile/expo.modules.devlauncher.launcher.DevLauncherActivity',
  );
}

async function launchMostRecentDevelopmentServer(deviceId) {
  await capture({
    command: adb,
    arguments_: [
      '-s',
      deviceId,
      'shell',
      'am',
      'start',
      '-a',
      'android.intent.action.MAIN',
      '-c',
      'android.intent.category.LAUNCHER',
      '-n',
      'com.youmotion.mobile/.MainActivity',
    ],
  });
}

async function connectDevelopmentClient() {
  const deviceId = await selectDevice();
  const metroUrl = encodeURIComponent(`http://127.0.0.1:${port}`);
  const developmentClientUrl = (
    `exp+youmotion://expo-development-client/?url=${metroUrl}`
  );
  await capture({
    command: adb,
    arguments_: [
      '-s',
      deviceId,
      'reverse',
      `tcp:${port}`,
      `tcp:${port}`,
    ],
  });
  await capture({
    command: adb,
    arguments_: [
      '-s',
      deviceId,
      'shell',
      'am',
      'start',
      '-W',
      '-a',
      'android.intent.action.VIEW',
      '-d',
      developmentClientUrl,
      'com.youmotion.mobile',
    ],
  });
  const retry = setTimeout(() => {
    void developmentLauncherVisible(deviceId)
      .then((visible) => visible
        ? launchMostRecentDevelopmentServer(deviceId)
        : undefined)
      .catch((cause) => {
        const message = cause instanceof Error ? cause.message : String(cause);
        process.stderr.write(`HARNESS Android launcher retry failed: ${message}\n`);
      });
  }, 6_000);
  retry.unref();
}

const harness = spawn(
  'pnpm',
  [
    'exec',
    'harness',
    '--config',
    'jest.harness.config.mjs',
    '--no-watchman',
    '--harnessRunner',
    runner,
    ...testArguments,
  ],
  {
    env: {
      ...process.env,
      RN_HARNESS_METRO_PORT: String(port),
      ...(harnessAppPath ? { HARNESS_APP_PATH: harnessAppPath } : {}),
    },
    stdio: ['inherit', 'pipe', 'pipe'],
  },
);

let recentOutput = '';
let clientConnectionStarted = false;

function forwardHarnessOutput({ chunk, destination }) {
  const text = String(chunk);
  destination.write(text);
  recentOutput = `${recentOutput}${text}`.slice(-500);
  if (
    clientConnectionStarted
    || !recentOutput.includes('ready')
  ) return;
  clientConnectionStarted = true;
  setTimeout(() => {
    void connectDevelopmentClient().catch((cause) => {
      const message = cause instanceof Error ? cause.message : String(cause);
      process.stderr.write(`HARNESS Android client connection failed: ${message}\n`);
      harness.kill('SIGTERM');
    });
  }, 2_000);
}

harness.stdout.on('data', (chunk) => {
  forwardHarnessOutput({ chunk, destination: process.stdout });
});
harness.stderr.on('data', (chunk) => {
  forwardHarnessOutput({ chunk, destination: process.stderr });
});
harness.on('error', (cause) => {
  throw cause;
});
harness.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exitCode = code ?? 1;
});

process.on('SIGINT', () => harness.kill('SIGINT'));
process.on('SIGTERM', () => harness.kill('SIGTERM'));
