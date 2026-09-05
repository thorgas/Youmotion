import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

if (!existsSync('ios/Podfile')) {
  throw new Error('Generate iOS first with pnpm exec expo prebuild --platform ios --no-install.');
}
if (process.env.EAS_BUILD) {
  throw new Error('Harness UI is for local simulator tests only.');
}

const original = readFileSync('package.json', 'utf8');
const manifest = require('../package.json');
const exclusions = manifest.expo.autolinking.ios.exclude;
manifest.expo.autolinking.ios.exclude = exclusions.filter(
  (name) => name !== '@react-native-harness/ui',
);

try {
  writeFileSync('package.json', `${JSON.stringify(manifest, null, 2)}\n`);
  execFileSync('pod', ['install', '--project-directory=ios'], { stdio: 'inherit' });
} finally {
  writeFileSync('package.json', original);
}

console.log('Local iOS pods include Harness UI. The store exclusion in package.json is restored.');
console.log('Build with xcodebuild next; Expo may substitute a cached build without Harness UI.');
