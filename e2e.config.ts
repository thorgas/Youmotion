import type { E2EConfig } from 'e2e';
import { mobile } from '@e2e-dev/mobile';

const platform = process.env['E2E_PLATFORM'] ?? 'ios';
if (platform !== 'ios' && platform !== 'android') throw new Error('E2E_PLATFORM must be ios or android.');
const device = process.env['E2E_DEVICE'];
if (!device) throw new Error('Set E2E_DEVICE to a dedicated disposable simulator or emulator. Tests clear app data.');

export default {
  targets: [{
    name: platform,
    engine: mobile({ platform, device, session: 'youmotion-appduct' }),
    app: {
      bundleId: 'com.youmotion.mobile',
      ...(platform === 'ios' ? { launchArguments: ['-EXDevMenuIsOnboardingFinished', 'YES', '-EXDevMenuShowsAtLaunch', 'NO'] } : {}),
    },
  }],
  tests: ['e2e/appduct/**/*.e2e.ts'],
  workers: 1,
  retries: 0,
  timeout: 120_000,
  assertionTimeout: 15_000,
  output: 'artifacts/e2e-appduct',
} satisfies E2EConfig;
