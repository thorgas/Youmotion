import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export function assertCaptureVersion(version) {
  if (version.trim() !== '0.20.10') throw new Error(`Capture requires the verified agent-device 0.20.10; received ${version.trim() || 'no version'}. Revalidate the workflow before changing this pin.`);
}

export function captureSteps({ device, output }) {
  if (!device) throw new Error('An explicit dedicated simulator UDID is required.');
  return [
    ['open', 'com.youmotion.mobile', '--platform', 'ios', '--udid', device, '--relaunch'],
    ['wait', 'id="tab-settings"'],
    ['press', 'id="tab-settings"', '--settle'],
    ['wait', 'id="settings-screen"'],
    ['scroll', 'bottom', '--settle'],
    ['press', 'id="restore-data-archive"', '--settle'],
    ['wait', 'id="youmotion-demo-backup.json, json"'],
    ['press', 'id="youmotion-demo-backup.json, json"', '--settle'],
    ['wait', 'text="133"'],
    ['wait', 'text="15"'],
    ['press', 'id="confirm-data-restore"', '--settle'],
    ['wait', 'id="data-safety-notice"'],
    ['press', 'id="data-safety-notice"', '--settle'],
    ['press', 'id="tab-analytics"', '--settle'],
    ['wait', 'id="analytics-screen"'],
    ['press', 'id="analytics-timeframe-all"', '--settle'],
    ['wait', 'text="Basierend auf 34 von 133 Momenten · Alle festgehaltenen Momente"'],
    ['gesture', 'pan', '220', '760', '0', '-540', '1500'],
    ['wait', 'label="Freude: 34"'],
    ['wait', 'label="Furcht: 19"'],
    ['screenshot', resolve(output, 'insights-chart-full.png'), '--pixel-density', '3', '--normalize-status-bar'],
  ];
}

export function runCapture(args) {
  const [device, output, confirmation] = args;
  if (confirmation !== '--confirm-synthetic-device' || !output) {
    throw new Error('Usage: pnpm exec node scripts/store-capture/restore-insights-ios-de.mjs UDID OUTPUT --confirm-synthetic-device');
  }
  const executable = verifiedExecutable();
  const steps = captureSteps({ device, output });
  mkdirSync(output, { recursive: true });
  const session = `store-restore-${process.pid}`;
  try {
    for (const [index, step] of steps.entries()) {
      console.log(`Store capture ${index + 1}/${steps.length}: ${step[0]}`);
      const result = spawnSync(executable, [...step, '--session', session], { encoding: 'utf8', timeout: 60000 });
      process.stdout.write(result.stdout ?? '');
      process.stderr.write(result.stderr ?? '');
      if (result.error || result.status !== 0) throw new Error(`Capture stopped at step ${index + 1}: ${result.error?.message ?? result.status}`);
    }
  } finally {
    spawnSync(executable, ['close', '--session', session], { stdio: 'inherit', timeout: 15000 });
  }
}

function verifiedExecutable() {
  const executable = process.env.AGENT_DEVICE_BIN;
  if (!executable || !isAbsolute(executable)) throw new Error('AGENT_DEVICE_BIN must explicitly name the absolute verified agent-device executable; pnpm may shadow it.');
  const version = spawnSync(executable, ['--version'], { encoding: 'utf8', timeout: 10000 });
  if (version.error || version.status !== 0) throw new Error('Unable to verify AGENT_DEVICE_BIN before device access.');
  assertCaptureVersion(version.stdout);
  return executable;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) runCapture(process.argv.slice(2));
