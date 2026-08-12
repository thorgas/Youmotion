import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

const benchmarkDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(benchmarkDirectory, '../..');
const resultsDirectory = resolve(benchmarkDirectory, 'results');
const logsDirectory = resolve(resultsDirectory, 'logs');
const device = process.env.BENCHMARK_DEVICE
  ?? '28FC32E3-9023-43E2-90C8-76D97ABBA3C8';
const maestro = process.env.MAESTRO_BIN
  ?? '/tmp/youmotion-maestro-2.8.0/extracted/maestro/bin/maestro';
const tokenizerRoot = process.env.TOKENIZER_ROOT
  ?? '/tmp/youmotion-benchmark-tokenizer/package.json';
const rounds = Number.parseInt(process.argv[2] ?? '10', 10);
const require = createRequire(tokenizerRoot);
const { encode } = require('gpt-tokenizer/encoding/o200k_base');

if (!Number.isSafeInteger(rounds) || rounds < 1) {
  throw new Error('Pass a positive integer number of rounds.');
}

mkdirSync(logsDirectory, { recursive: true });

const definitions = {
  argent: resolve(projectRoot, '.argent/flows/benchmark-onboarding-replay.yaml'),
  maestro: resolve(benchmarkDirectory, 'maestro-onboarding-replay.yaml'),
};
const commands = {
  argent: {
    command: 'argent',
    args: ['flow', 'run', definitions.argent, '--device', device, '--json'],
    env: process.env,
  },
  maestro: {
    command: maestro,
    args: [
      '--device', device,
      '--no-ansi',
      'test',
      definitions.maestro,
    ],
    env: {
      ...process.env,
      JAVA_TOOL_OPTIONS: '-Duser.home=/tmp/youmotion-maestro-home',
      MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED: 'true',
      MAESTRO_CLI_NO_ANALYTICS: '1',
    },
  },
};

const samples = [];

function run({ tool, round, order }) {
  const specification = commands[tool];
  const startedAt = new Date().toISOString();
  const start = performance.now();
  const result = spawnSync(specification.command, specification.args, {
    cwd: projectRoot,
    encoding: 'utf8',
    env: specification.env,
    maxBuffer: 16 * 1024 * 1024,
    timeout: 120_000,
  });
  const durationMs = performance.now() - start;
  const stdout = result.stdout ?? '';
  const stderr = result.stderr ?? '';
  const combinedOutput = `${stdout}${stderr}`;
  const sample = {
    tool,
    round,
    order,
    startedAt,
    durationMs,
    exitCode: result.status,
    signal: result.signal,
    error: result.error?.message ?? null,
    passed: result.status === 0,
    outputBytes: Buffer.byteLength(combinedOutput),
    outputTokensO200k: encode(combinedOutput).length,
  };
  const stem = `${String(round).padStart(2, '0')}-${order}-${tool}`;
  writeFileSync(resolve(logsDirectory, `${stem}.stdout.log`), stdout);
  writeFileSync(resolve(logsDirectory, `${stem}.stderr.log`), stderr);
  samples.push(sample);
  process.stdout.write(
    `${tool} round ${round} order ${order}: ${sample.passed ? 'PASS' : 'FAIL'} `
      + `${(durationMs / 1000).toFixed(3)}s ${sample.outputTokensO200k} output tokens\n`,
  );
}

for (let round = 1; round <= rounds; round += 1) {
  const order = round % 2 === 1
    ? ['argent', 'maestro']
    : ['maestro', 'argent'];
  order.forEach((tool, index) => run({ tool, round, order: index + 1 }));
}

const definitionMetrics = Object.fromEntries(
  Object.entries(definitions).map(([tool, path]) => {
    const contents = readFileSync(path, 'utf8');
    return [tool, {
      path: path.slice(projectRoot.length + 1),
      bytes: Buffer.byteLength(contents),
      lines: contents.trimEnd().split('\n').length,
      tokensO200k: encode(contents).length,
    }];
  }),
);

const output = {
  generatedAt: new Date().toISOString(),
  environment: {
    device,
    platform: 'iOS 26.1',
    model: 'iPhone 17 Pro',
    appId: 'com.youmotion.mobile',
    metroUrl: 'http://127.0.0.1:8091',
    argentVersion: '0.20.0',
    maestroVersion: '2.8.0',
    tokenizer: 'gpt-tokenizer 3.4.0 / o200k_base',
    roundsPerTool: rounds,
    warmupsExcluded: 1,
  },
  definitionMetrics,
  samples,
};

writeFileSync(resolve(resultsDirectory, 'raw-results.json'), `${JSON.stringify(output, null, 2)}\n`);
