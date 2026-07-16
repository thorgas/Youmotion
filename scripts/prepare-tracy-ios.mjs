import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const tracyDirectory = join(
  process.cwd(),
  'node_modules',
  '@ottrelite',
  'backend-wrapper-tracy',
  'ios',
  'tracy',
);
const iosDirectory = join(process.cwd(), 'ios');
const podfile = join(iosDirectory, 'Podfile');
const mappedTracyHeader = join(
  iosDirectory,
  'Pods',
  'Headers',
  'Public',
  'ReactNativeOttreliteBackendTracy',
  'tracy',
  'Tracy.hpp',
);

if (!existsSync(tracyDirectory)) {
  const clone = spawnSync(
    'git',
    ['clone', '--depth', '1', '--branch', 'v0.12.2', 'https://github.com/wolfpld/tracy.git', tracyDirectory],
    { stdio: 'inherit' },
  );

  if (clone.status !== 0) process.exit(clone.status ?? 1);
}

if (existsSync(podfile) && !existsSync(mappedTracyHeader)) {
  const pods = spawnSync('pod', ['install'], { cwd: iosDirectory, stdio: 'inherit' });

  if (pods.status !== 0) process.exit(pods.status ?? 1);
}
