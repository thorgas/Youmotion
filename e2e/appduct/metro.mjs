import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execute = promisify(execFile);

export async function restoreMetroForwarding() {
  if (process.env.E2E_PLATFORM !== 'android') return;
  const serial = process.env.E2E_DEVICE;
  if (!serial || !/^emulator-\d+$/.test(serial)) throw new Error('Android E2E forwarding requires an explicit disposable emulator serial.');
  await execute('adb', ['-s', serial, 'reverse', 'tcp:8091', 'tcp:8091'], { timeout: 15_000 });
}
