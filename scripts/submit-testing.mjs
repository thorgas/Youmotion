import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import * as Schema from 'effect/Schema';
import * as Effect from 'effect/Effect';

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    id: { type: 'string' },
    latest: { type: 'boolean' },
    'dry-run': { type: 'boolean' },
    'non-interactive': { type: 'boolean' },
  },
});
const platform = positionals[0];
if (!['ios', 'android'].includes(platform) || positionals.length !== 1) {
  throw new Error('Usage: node scripts/submit-testing.mjs ios|android [--id UUID] [--dry-run]');
}
if (values.id && values.latest) throw new Error('Choose --id or --latest, not both.');

const Build = Schema.Struct({
  id: Schema.String,
  status: Schema.Literal('FINISHED'),
  platform: Schema.String,
  buildProfile: Schema.Literal('testing'),
  distribution: Schema.Literal('STORE'),
  gitCommitHash: Schema.String,
  project: Schema.Struct({ id: Schema.Literal('7f37690f-c632-408c-a4ab-1b240610bd12') }),
  artifacts: Schema.Struct({ buildUrl: Schema.String }),
});
const eas = ({ args, capture = false }) => execFileSync('pnpm', ['exec', 'eas', ...args], {
  encoding: 'utf8',
  stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
});
const build = values.id
  ? await Effect.runPromise(Schema.decodeUnknown(Schema.parseJson(Build))(
    eas({ args: ['build:view', values.id, '--json'], capture: true }),
  ))
  : (await Effect.runPromise(Schema.decodeUnknown(Schema.parseJson(Schema.Array(Build)))(
    eas({ args: ['build:list', '--platform', platform, '--build-profile', 'testing',
      '--status', 'finished', '--distribution', 'store', '--limit', '1', '--json'], capture: true }),
  )))[0];
if (!build) throw new Error(`No finished testing build exists for ${platform}.`);
if (build.platform.toLowerCase() !== platform) throw new Error('Build platform does not match.');
console.log(`Testing ${platform} build: ${build.id}\nCommit: ${build.gitCommitHash}`);
async function verifyIosArchive(buildUrl) {
  const directory = mkdtempSync(join(tmpdir(), 'youmotion-testing-ipa-'));
  try {
    const response = await fetch(buildUrl);
    if (!response.ok) throw new Error(`IPA download failed: HTTP ${response.status}`);
    const archive = join(directory, 'Youmotion.ipa');
    writeFileSync(archive, Buffer.from(await response.arrayBuffer()));
    execFileSync('bash', ['scripts/verify-ios-store-archive.sh', archive], { stdio: 'inherit' });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

if (!values['dry-run']) {
  if (platform === 'ios') await verifyIosArchive(build.artifacts.buildUrl);
  eas({ args: ['submit', '--platform', platform, '--profile', 'testing', '--id', build.id,
    ...(values['non-interactive'] ? ['--non-interactive'] : [])] });
}
