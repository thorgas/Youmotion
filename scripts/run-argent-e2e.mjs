import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { basename, resolve } from 'node:path';

const projectRoot = process.cwd();
const flowDirectory = resolve(projectRoot, '.argent', 'flows', 'e2e');
const artifactDirectory = resolve(projectRoot, 'artifacts', 'argent');
const metroPort = process.env.E2E_METRO_PORT ?? '8091';
const metroStatusUrl = `http://127.0.0.1:${metroPort}/status`;
const androidSdkRoot = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT;
const adb = androidSdkRoot
  ? resolve(androidSdkRoot, 'platform-tools', 'adb')
  : 'adb';

function parsePositiveInteger({ name, value }) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return parsed;
}

function parseArguments() {
  const arguments_ = process.argv.slice(2);
  const optionDefinitions = new Map([
    ['--device', { key: 'device', parse: (value) => value }],
    ['--flow', { key: 'flow', parse: (value) => value }],
    ['--passes', { key: 'passes', parse: (value) => parsePositiveInteger({ name: '--passes', value }) }],
    ['--platform', { key: 'platform', parse: (value) => value }],
  ]);
  const options = {
    device: process.env.E2E_DEVICE
      ?? process.env.ARGENT_DEVICE
      ?? process.env.ANDROID_SERIAL,
    flow: undefined,
    passes: parsePositiveInteger({ name: 'E2E_PASSES', value: process.env.E2E_PASSES ?? '2' }),
    platform: process.env.E2E_PLATFORM,
  };

  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    const value = arguments_[index + 1];
    const definition = optionDefinitions.get(argument);
    if (!definition) throw new Error(`Unknown argument: ${argument}`);
    if (!value) throw new Error(`${argument} requires a value.`);
    options[definition.key] = definition.parse(value);
    index += 1;
  }

  if (!options.device) {
    throw new Error(
      'Set E2E_DEVICE to the dedicated simulator UDID or Android emulator serial. '
      + 'Find it with `argent run list-devices --json`.',
    );
  }
  if (options.platform !== undefined && !['ios', 'android'].includes(options.platform)) {
    throw new Error('E2E_PLATFORM must be ios or android.');
  }
  return options;
}

function run({ arguments_, command }) {
  return new Promise((...promiseControls) => {
    const [resolvePromise, rejectPromise] = promiseControls;
    const child = spawn(command, arguments_, {
      cwd: projectRoot,
      env: process.env,
      stdio: 'inherit',
    });
    child.once('error', rejectPromise);
    child.once('exit', (...exit) => {
      const [code, signal] = exit;
      if (signal) {
        rejectPromise(new Error(`${command} stopped with signal ${signal}.`));
        return;
      }
      if (code !== 0) {
        rejectPromise(new Error(`${command} exited with code ${String(code)}.`));
        return;
      }
      resolvePromise();
    });
  });
}

async function requireMetro() {
  let healthy = false;
  try {
    const response = await fetch(metroStatusUrl, { signal: AbortSignal.timeout(3_000) });
    const status = await response.text();
    healthy = response.ok && status.includes('packager-status:running');
  } catch {
    healthy = false;
  }
  if (healthy) return;
  throw new Error(`Metro is not ready on port ${metroPort}. Start it in another terminal with \`pnpm start:e2e\`.`);
}

function selectedFlows(flow) {
  if (flow) {
    if (flow !== basename(flow) || !flow.endsWith('.yaml')) {
      throw new Error('--flow must be a YAML filename from .argent/flows/e2e.');
    }
    const path = resolve(flowDirectory, flow);
    if (!existsSync(path)) throw new Error(`Argent flow was not found: ${path}`);
    return [path];
  }
  if (!existsSync(flowDirectory)) {
    throw new Error(`Argent E2E flow directory was not found: ${flowDirectory}`);
  }
  return readdirSync(flowDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.yaml'))
    .map((entry) => resolve(flowDirectory, entry.name))
    .toSorted();
}

async function prepareDevice({ device, platform }) {
  await run({
    arguments_: ['run', 'stop-all-simulator-servers', '--devices', device],
    command: 'argent',
  });
  if (platform !== 'android') return;
  await run({
    arguments_: [
      '-s',
      device,
      'reverse',
      `tcp:${metroPort}`,
      `tcp:${metroPort}`,
    ],
    command: adb,
  });
  await run({
    arguments_: ['-s', device, 'shell', 'am', 'force-stop', 'com.youmotion.mobile'],
    command: adb,
  });
}

async function runPasses({ device, flow, pass, passes, platform }) {
  if (pass > passes) return;
  await prepareDevice({ device, platform });
  process.stdout.write(`\nArgent E2E pass ${String(pass)}/${String(passes)}: ${flow}\n`);
  const arguments_ = ['flow', 'run', flow, '--device', device, '--output', artifactDirectory];
  if (platform) arguments_.push('--platform', platform);
  await run({ arguments_, command: 'argent' });
  await runPasses({ device, flow, pass: pass + 1, passes, platform });
}

async function runFlows({ device, flows, index, passes, platform }) {
  const flow = flows[index];
  if (!flow) return;
  await runPasses({ device, flow, pass: 1, passes, platform });
  await runFlows({ device, flows, index: index + 1, passes, platform });
}

async function main() {
  const options = parseArguments();
  await requireMetro();
  await runFlows({ ...options, flows: selectedFlows(options.flow), index: 0 });
}

await main();
