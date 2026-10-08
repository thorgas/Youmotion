/* oxlint-disable architecture/no-multiple-function-params -- The injected subprocess boundary deliberately mirrors command/argv; coordinator tests pin each call. */
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import * as Schema from 'effect/Schema';

const Json = Schema.parseJson(Schema.Unknown);
const decode = Schema.decodeUnknownPromise(Json);
const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const shaPattern = /^[a-f0-9]{40}$/i;
const reusable = new Set(['NEW', 'IN_QUEUE', 'IN_PROGRESS', 'FINISHED']);
const platforms = ['ios', 'android'];

export function assertProductionEnvironment(env) {
  for (const [name, value] of Object.entries(env)) {
    if (!value) continue;
    if (!/FINGERPRINT_OVERRIDE/.test(name) && (value === 'false' || value === '0')) continue;
    if (/E2E|TRACY|APPDUCT|FINGERPRINT_OVERRIDE/.test(name)) {
      throw new Error(`Remove ${name} before a production release.`);
    }
  }
}

function object(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Invalid ${label}.`);
  return value;
}

// oxlint-disable-next-line complexity -- Validate the complete immutable EAS production identity before trusting any job; mismatch cases have permanent tests.
function buildRecord(value, source, version, projectId) {
  const build = object(value, 'EAS build record');
  const project = object(build.project, 'EAS project');
  const platform = typeof build.platform === 'string' ? build.platform.toLowerCase() : '';
  if (!uuid.test(build.id) || !platforms.includes(platform)
    || build.gitCommitHash !== source || build.appVersion !== version
    || build.buildProfile !== 'production' || build.channel !== 'production'
    || project.id !== projectId || build.distribution !== 'STORE'
    || build.isForIosSimulator !== false) {
    throw new Error('EAS returned a build outside the exact production source/version/project contract.');
  }
  if (!reusable.has(build.status)) throw new Error(`Build ${build.id} is ${build.status}; investigate before creating another job.`);
  return { id: build.id, platform, status: build.status, source, version, projectId,
    ...(typeof build.appBuildVersion === 'string' ? { appBuildVersion: build.appBuildVersion } : {}),
    ...(typeof build.runtimeVersion === 'string' ? { runtimeVersion: build.runtimeVersion } : {}),
    url: `https://expo.dev/accounts/youmotion/projects/youmotion/builds/${build.id}` };
}

// oxlint-disable-next-line complexity -- Ordered release coordinator keeps failure, persisted intent and mutation boundaries together; injected-command tests cover each branch.
export async function coordinateProductionBuilds({ run, read, save, env = {}, mode = 'build', requestedSource, targetPlatform = 'all', progress = () => {} }) {
  assertProductionEnvironment(env);
  if (!['all', ...platforms].includes(targetPlatform)) throw new Error('--platform must be all, ios or android.');
  const targets = targetPlatform === 'all' ? platforms : [targetPlatform];
  const eas = object(await decode(await read('eas.json')), 'EAS config');
  const production = object(object(eas.build, 'EAS build profiles').production, 'production profile');
  if (production.environment !== 'production' || production.channel !== 'production'
    || production.developmentClient === true || production.ios?.simulator === true
    || (production.distribution && production.distribution !== 'store')) throw new Error('Production EAS profile must target production store binaries.');
  assertProductionEnvironment(production.env ?? {});
  const packageConfig = object(await decode(await read('package.json')), 'package config');
  if (packageConfig.devDependencies?.['eas-cli'] !== '21.0.0') throw new Error('Production commands require pinned eas-cli 21.0.0.');
  const head = (await run('git', ['rev-parse', 'HEAD'])).trim();
  const source = requestedSource ?? head;
  if (!shaPattern.test(source)) throw new Error('--source requires an exact 40-character commit SHA.');
  if (mode !== 'status' && source !== head) throw new Error('Build/check must use current HEAD; --source selects earlier builds only with --status.');
  if (mode !== 'status' && (await run('git', ['status', '--porcelain'])).trim()) throw new Error('Commit all release source changes first; the working tree must be clean.');
  const readSource = (path) => source === head ? read(path) : run('git', ['show', `${source}:${path}`]);
  const app = object(await decode(await readSource('app.json')), 'app config');
  const expo = object(app.expo, 'Expo config');
  const store = object(await decode(await readSource('store.config.json')), 'store config');
  const apple = object(store.apple, 'Apple config');
  const projectId = object(object(expo.extra, 'Expo extra').eas, 'EAS config').projectId;
  const version = expo.version;
  if (typeof version !== 'string' || version !== apple.version || !uuid.test(projectId)) throw new Error('App/store version or EAS project configuration does not match.');
  const identity = { source, version, projectId };
  if (mode === 'check') return { ...identity, builds: [], checked: true };
  let previous;
  try { previous = await decode(await read(`artifacts/releases/${version}/${source}.json`)); } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const records = new Map();
  const persist = async (attempt) => save(`artifacts/releases/${version}/${source}.json`, {
    ...identity, builds: [...records.values()], ...(attempt ? { attempt } : {}),
  });
  const validate = (values) => {
    if (!Array.isArray(values)) throw new Error('EAS response must be a build array.');
    for (const value of values) {
      const record = buildRecord(value, source, version, projectId);
      if (records.has(record.platform) && records.get(record.platform).id !== record.id) throw new Error(`Multiple production ${record.platform} jobs match; select a candidate manually before continuing.`);
      records.set(record.platform, record);
    }
  };
  progress('Discovering production jobs for the exact source and version…');
  const discovered = await decode(await run('pnpm', ['exec', 'eas', 'build:list', '--platform', 'all', '--build-profile', 'production', '--distribution', 'store', '--git-commit-hash', source, '--app-version', version, '--limit', '50', '--non-interactive', '--json']));
  if (Array.isArray(discovered) && discovered.length >= 50) throw new Error('Discovery limit reached; investigate all candidates before launching.');
  validate(discovered);
  const missing = targets.filter((platform) => !records.has(platform));
  if (mode === 'status' && missing.length) throw new Error(`No production job for ${missing.join(', ')} at ${source}. Re-query before launching anything.`);
  if (mode === 'build' && missing.length && ['unknown', 'launch-requested'].includes(previous?.attempt?.state)) {
    throw new Error('Earlier launch has an unknown outcome and discovery is still incomplete. Re-query --status; investigate EAS before another launch.');
  }
  await persist();
  if (mode === 'build' && missing.length) {
    progress('Running production source verification…');
    await run('pnpm', ['verify']);
    progress('Running coverage checks…');
    await run('pnpm', ['test:coverage']);
    const platform = missing.length === 2 ? 'all' : missing[0];
    const attempt = { platforms: missing, state: 'launch-requested', requestedAt: new Date().toISOString() };
    await persist(attempt);
    progress(`Requesting production ${platform} build jobs…`);
    try {
      validate(await decode(await run('pnpm', ['exec', 'eas', 'build', '--platform', platform, '--profile', 'production', '--non-interactive', '--no-wait', '--json'])));
      if (missing.some((requested) => !records.has(requested))) throw new Error('EAS launch response omitted a requested platform.');
      await persist();
    } catch {
      await persist({ ...attempt, state: 'unknown' });
      throw new Error('EAS launch outcome is unknown. Jobs may already exist. Run --status before retrying; discovery on rerun will reuse matching jobs.');
    }
  }
  for (const [platform, record] of records) {
    progress(`Reading back ${platform} build ${record.id}…`);
    // oxlint-disable-next-line no-await-in-loop -- Read back and persist each platform before proceeding so partial failures preserve evidence.
    const confirmed = buildRecord(await decode(await run('pnpm', ['exec', 'eas', 'build:view', record.id, '--json'])), source, version, projectId);
    if (confirmed.id !== record.id || confirmed.platform !== platform) throw new Error('EAS readback changed the selected build identity.');
    records.set(platform, confirmed);
    // oxlint-disable-next-line no-await-in-loop -- Preserve each confirmed platform immediately before the next remote request.
    await persist();
  }
  if (targets.some((platform) => !records.has(platform))) throw new Error('EAS did not return every requested production job. Run --status before retrying.');
  return { ...identity, builds: [...records.values()] };
}

function runCommand(command, args) {
  return new Promise((resolveResult, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'inherit'], timeout: 20 * 60 * 1000 });
    let stdout = '';
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.on('error', reject);
    child.on('close', (code, signal) => {
      if (code !== 0) reject(new Error(`${command} failed (${signal ?? code}).`));
      else resolveResult(stdout);
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    console.log('Production store build coordinator\nUsage: pnpm build:production [--check | --status] [--source <40-character SHA>] [--platform all|ios|android]\n--check: validate clean source, version and production environment; creates no jobs.\n--status: discover and read back both existing jobs; creates no jobs.\nDefault: verify, cover, discover/reuse exact jobs and create only missing platforms.\nNo store upload or review submission is performed.');
    return;
  }
  let mode = 'build';
  let requestedSource;
  let targetPlatform = 'all';
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--platform') {
      targetPlatform = args[index + 1];
      index += 1;
    } else if (args[index] === '--source') {
      requestedSource = args[index + 1];
      index += 1;
      if (!requestedSource) throw new Error('--source needs a commit SHA.');
    } else if (['--check', '--status'].includes(args[index]) && mode === 'build') mode = args[index].slice(2);
    else throw new Error(`Unknown or conflicting argument: ${args[index]}`);
  }
  const result = await coordinateProductionBuilds({ run: runCommand, env: process.env, mode, requestedSource, targetPlatform,
    progress: (message) => console.error(message),
    read: (path) => readFile(path, 'utf8'),
    save: async (path, record) => { await mkdir(dirname(path), { recursive: true }); await writeFile(path, `${JSON.stringify(record, null, 2)}\n`); },
  });
  console.log(`Production ${result.version} source ${result.source}`);
  if (result.checked) console.log('Source/configuration checks passed. No cloud jobs created.');
  for (const build of result.builds) console.log(`${build.platform}: ${build.status} ${build.url}`);
  if (!result.checked) console.log('Build records confirmed. Queued/running jobs still need a FINISHED readback before store upload.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
