import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const defaultRoot = resolve(scriptDirectory, '..');

function selectValues({ available, label, requested }) {
  if (requested === 'all') return available;
  const values = requested.split(',').filter(Boolean);
  const unknown = values.filter((value) => !available.includes(value));
  if (unknown.length > 0) throw new Error(`Unknown ${label}: ${unknown.join(', ')}`);
  return values;
}

export function parseArguments(arguments_) {
  const options = {
    config: 'store/screenshots/pipeline.config.json',
    dryRun: false,
    locale: 'all',
    platform: 'all',
    scene: 'all',
  };
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === '--') continue;
    if (argument === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    const key = argument?.startsWith('--') ? argument.slice(2) : undefined;
    if (!key || !['config', 'locale', 'platform', 'scene'].includes(key)) {
      throw new Error(`Unknown argument: ${argument}`);
    }
    const value = arguments_[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for --${key}`);
    options[key] = value;
    index += 1;
  }
  return options;
}

export function createCapturePlan({ config, options, repositoryRoot }) {
  if (config.schemaVersion !== 1) throw new Error('Unsupported screenshot pipeline schemaVersion.');
  if (!Array.isArray(config.locales) || config.locales.length === 0) throw new Error('Configure at least one locale.');
  if (!Array.isArray(config.scenes) || config.scenes.length === 0) throw new Error('Configure at least one scene.');
  if (!Array.isArray(config.command) || config.command.length === 0) throw new Error('Configure a capture command.');
  const platformNames = Object.keys(config.platforms ?? {});
  if (platformNames.length === 0) throw new Error('Configure at least one platform.');

  const platforms = selectValues({ available: platformNames, label: 'platform', requested: options.platform });
  const locales = selectValues({ available: config.locales, label: 'locale', requested: options.locale });
  const scenes = selectValues({ available: config.scenes, label: 'scene', requested: options.scene });

  return platforms.flatMap((platform) => {
    const platformConfig = config.platforms[platform];
    if (!platformConfig?.goldieConfig || !platformConfig.artifactEnv) {
      throw new Error(`${platform} must configure goldieConfig and artifactEnv.`);
    }
    const goldieConfig = resolve(repositoryRoot, platformConfig.goldieConfig);
    if (!existsSync(goldieConfig)) throw new Error(`Missing Goldie config: ${goldieConfig}`);
    const artifactValue = process.env[platformConfig.artifactEnv];
    if (!artifactValue) throw new Error(`Set ${platformConfig.artifactEnv} to the exact release artifact path.`);
    const artifactPath = isAbsolute(artifactValue) ? artifactValue : resolve(repositoryRoot, artifactValue);
    if (!existsSync(artifactPath)) throw new Error(`Missing release artifact: ${artifactPath}`);

    return locales.flatMap((locale) => scenes.map((scene) => ({
      artifactEnv: platformConfig.artifactEnv,
      artifactPath,
      goldieConfig,
      locale,
      platform,
      scene,
    })));
  });
}

async function collectArtifactFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const entryPath = resolve(directory, entry.name);
    if (entry.isDirectory()) return collectArtifactFiles(entryPath);
    if (entry.isFile()) return [entryPath];
    throw new Error(`Unsupported artifact entry: ${entryPath}`);
  }));
  return nested.flat();
}

async function artifactSha256(path) {
  const hash = createHash('sha256');
  const metadata = await stat(path);
  if (metadata.isFile()) return hash.update(await readFile(path)).digest('hex');
  if (!metadata.isDirectory()) throw new Error(`Unsupported release artifact: ${path}`);

  const files = (await collectArtifactFiles(path)).toSorted();
  const contents = await Promise.all(files.map((file) => readFile(file)));
  for (const [index, file] of files.entries()) {
    hash.update(`file:${relative(path, file)}\0`);
    hash.update(contents[index]);
  }
  return hash.digest('hex');
}

function gitCommit(repositoryRoot) {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: repositoryRoot, encoding: 'utf8' });
  if (result.status !== 0) throw new Error('Unable to resolve the capture commit.');
  return result.stdout.trim();
}

async function run() {
  const options = parseArguments(process.argv.slice(2));
  const repositoryRoot = defaultRoot;
  const configPath = resolve(repositoryRoot, options.config);
  const configBytes = await readFile(configPath);
  const config = JSON.parse(configBytes.toString('utf8'));
  const plan = createCapturePlan({ config, options, repositoryRoot });

  console.log(`Store screenshot matrix: ${plan.length} independent capture(s)`);
  for (const item of plan) console.log(`- ${item.platform} / ${item.locale} / ${item.scene}`);
  if (options.dryRun) return;

  const artifactPaths = [...new Set(plan.map((item) => item.artifactPath))];
  const hashes = await Promise.all(artifactPaths.map((path) => artifactSha256(path)));
  const artifactHashes = new Map(artifactPaths.map((path, index) => [path, hashes[index]]));
  const results = [];
  const startedAt = new Date().toISOString();
  for (const item of plan) {
    const started = Date.now();
    console.log(`Capturing ${item.platform} / ${item.locale} / ${item.scene}`);
    const [command, ...commandArguments] = config.command;
    const result = spawnSync(command, commandArguments, {
      cwd: repositoryRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        GOLDIE_CONFIG: item.goldieConfig,
        GOLDIE_LOCALE: item.locale,
        GOLDIE_SCENE: item.scene,
        [item.artifactEnv]: item.artifactPath,
      },
      stdio: 'inherit',
    });
    results.push({
      durationMs: Date.now() - started,
      exitCode: result.status,
      locale: item.locale,
      platform: item.platform,
      scene: item.scene,
    });
    if (result.status !== 0) break;
  }

  const reportPath = resolve(repositoryRoot, config.reportPath);
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify({
    artifacts: [...artifactHashes].map(([path, hash]) => ({ path, sha256: hash })),
    command: config.command,
    configPath,
    configSha256: createHash('sha256').update(configBytes).digest('hex'),
    finishedAt: new Date().toISOString(),
    releaseCommit: gitCommit(repositoryRoot),
    results,
    schemaVersion: 1,
    startedAt,
  }, null, 2)}\n`);

  const failure = results.find((result) => result.exitCode !== 0);
  if (failure) {
    throw new Error(`Capture failed at ${failure.platform} / ${failure.locale} / ${failure.scene}.`);
  }
  console.log(`Capture report: ${reportPath}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  run().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
