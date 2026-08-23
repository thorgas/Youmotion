import { execFile, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const executeFile = promisify(execFile);
const projectRoot = process.cwd();
const androidHome = process.env.ANDROID_HOME
  ?? join(homedir(), 'Library', 'Android', 'sdk');
const adb = join(androidHome, 'platform-tools', 'adb');
const apk = process.env.E2E_RELEASE_APK
  ?? join(
    projectRoot,
    'android',
    'app',
    'build',
    'outputs',
    'apk',
    'release',
    'app-release.apk',
  );
const appId = 'com.youmotion.mobile';
const localeCases = [
  {
    configurationMarker: '-de-rDE,',
    locale: 'de-DE',
    flow: 'release-onboarding-locale-de.yaml',
  },
  {
    configurationMarker: '-en-rUS,',
    locale: 'en-US',
    flow: 'release-onboarding-locale-en.yaml',
  },
];

async function capture({ command, arguments_ }) {
  const { stdout, stderr } = await executeFile(command, arguments_, {
    timeout: 60_000,
  });
  return `${stdout}${stderr}`.trim();
}

function run({ command, arguments_, options = {} }) {
  return new Promise((...promiseControls) => {
    const [resolve, reject] = promiseControls;
    const child = spawn(command, arguments_, {
      cwd: projectRoot,
      stdio: 'inherit',
      ...options,
    });
    child.on('error', reject);
    child.on('exit', (...exit) => {
      const [code, signal] = exit;
      if (signal) {
        reject(new Error(`${command} stopped with signal ${signal}.`));
        return;
      }
      if (code !== 0) {
        reject(new Error(`${command} exited with code ${String(code)}.`));
        return;
      }
      resolve();
    });
  });
}

function delay(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function connectedEmulators() {
  const output = await capture({ command: adb, arguments_: ['devices'] });
  return output
    .split('\n')
    .slice(1)
    .map((line) => line.trim().split(/\s+/))
    .filter((parts) => parts[1] === 'device')
    .map((parts) => parts[0])
    .filter((deviceId) => deviceId?.startsWith('emulator-'));
}

async function selectEmulator() {
  if (process.env.ANDROID_SERIAL?.startsWith('emulator-')) {
    return process.env.ANDROID_SERIAL;
  }
  const emulators = await connectedEmulators();
  if (emulators.length === 1) return emulators[0];
  throw new Error(
    'Start exactly one dedicated Android emulator or set ANDROID_SERIAL to an emulator.',
  );
}

async function installReleaseAttempt({ attempt, deviceId }) {
  try {
    await capture({
      command: adb,
      arguments_: ['-s', deviceId, 'install', '-g', apk],
    });
  } catch (cause) {
    if (attempt >= 11) throw cause;
    await delay(5_000);
    return installReleaseAttempt({ attempt: attempt + 1, deviceId });
  }
}

async function uninstallReleaseAttempt({ attempt, deviceId }) {
  try {
    await capture({
      command: adb,
      arguments_: ['-s', deviceId, 'uninstall', appId],
    });
  } catch (cause) {
    const details = String(cause);
    if (details.includes('Unknown package') || details.includes('not installed')) return;
    if (attempt >= 11) throw cause;
    await delay(5_000);
    await uninstallReleaseAttempt({ attempt: attempt + 1, deviceId });
  }
}

async function installFreshRelease(deviceId) {
  await uninstallReleaseAttempt({ attempt: 0, deviceId });
  await installReleaseAttempt({ attempt: 0, deviceId });
}

async function requireSystemLocale({ deviceId, localeCase }) {
  const activeConfiguration = await capture({
    command: adb,
    arguments_: ['-s', deviceId, 'shell', 'am', 'get-config'],
  });
  if (!activeConfiguration.includes(localeCase.configurationMarker)) {
    throw new Error(
      `Set ${deviceId} to ${localeCase.locale} first, with the other supported locale as fallback, `
      + 'in Android Settings > System > Languages.',
    );
  }
}

async function launchInstalledApp(deviceId) {
  await capture({
    command: adb,
    arguments_: ['-s', deviceId, 'shell', 'am', 'force-stop', appId],
  });
  await capture({
    command: adb,
    arguments_: ['-s', deviceId, 'shell', 'am', 'start', '-n', `${appId}/.MainActivity`],
  });
}

async function runArgentPass({ deviceId, flow, pass }) {
  process.stdout.write(`Argent release-locale pass ${String(pass)}/2.\n`);
  await launchInstalledApp(deviceId);
  await run({
    command: 'argent',
    arguments_: [
      'flow',
      'run',
      flow,
      '--device',
      deviceId,
      '--platform',
      'android',
      '--output',
      join(projectRoot, 'artifacts', 'argent'),
    ],
  });
}

async function runLocaleCase({ deviceId, localeCase }) {
  process.stdout.write(`\nTesting release onboarding with ${localeCase.locale}.\n`);
  await requireSystemLocale({ deviceId, localeCase });
  await installFreshRelease(deviceId);
  const flow = join(projectRoot, '.argent', 'flows', 'e2e', localeCase.flow);
  await runArgentPass({ deviceId, flow, pass: 1 });
  await runArgentPass({ deviceId, flow, pass: 2 });
}

async function buildRelease() {
  if (process.env.E2E_RELEASE_SKIP_BUILD === 'true') return;
  await run({
    command: join(projectRoot, 'android', 'gradlew'),
    arguments_: ['app:assembleRelease'],
    options: {
      cwd: join(projectRoot, 'android'),
    },
  });
}

async function main() {
  if (!existsSync(adb)) throw new Error(`adb was not found at ${adb}.`);
  const requestedLocale = process.env.E2E_EXPECTED_LOCALE;
  const localeCase = localeCases.find((candidate) => candidate.locale === requestedLocale);
  if (!localeCase) {
    throw new Error('Set E2E_EXPECTED_LOCALE to de-DE or en-US.');
  }
  const deviceId = await selectEmulator();
  await buildRelease();
  if (!existsSync(apk)) throw new Error(`Release APK was not found at ${apk}.`);
  const flow = join(projectRoot, '.argent', 'flows', 'e2e', localeCase.flow);
  if (!existsSync(flow)) throw new Error(`Argent flow was not found at ${flow}.`);
  await runLocaleCase({ deviceId, localeCase });
}

await main();
