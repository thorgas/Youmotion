import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const repositoryRoot = resolve(new URL('..', import.meta.url).pathname);
const goldie = await import('../node_modules/goldie/dist/index.js');

const SCENES = [
  ['today', 'pulse'],
  ['history', 'history-all-time'],
  ['insights', 'insights-all-time'],
  ['insights-calendar', 'insights-august-calendar'],
  ['settings', 'settings-data'],
];

export function parseArguments(args) {
  const options = { output: 'goldie/out/native-frame', platform: 'all', locale: 'all', root: repositoryRoot };
  for (let i = 0; i < args.length; i += 1) {
    const key = args[i]?.startsWith('--') ? args[i].slice(2) : undefined;
    if (!key || !['output', 'platform', 'locale', 'root'].includes(key)) throw new Error(`Unknown argument: ${args[i]}`);
    const value = args[i + 1];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for --${key}`);
    options[key] = value;
    i += 1;
  }
  return options;
}

export function buildRenderPlan({ root, output, platform, locale }) {
  const platforms = platform === 'all' ? ['ios', 'android'] : platform.split(',');
  const locales = locale === 'all' ? ['en-US', 'de-DE'] : locale.split(',');
  for (const value of platforms) if (!['ios', 'android'].includes(value)) throw new Error(`Unknown platform: ${value}`);
  for (const value of locales) if (!['en-US', 'de-DE'].includes(value)) throw new Error(`Unknown locale: ${value}`);
  return platforms.flatMap((target) => locales.map((targetLocale) => {
    const sourceLocale = target === 'android' ? (targetLocale === 'en-US' ? 'en' : 'de') : targetLocale;
    const device = target === 'ios' ? 'iphone-6.9' : 'pixel-10-pro';
    const sourceDir = target === 'ios'
      ? join(root, 'goldie/out/agent-device/ios', sourceLocale, 'iphone-6.9')
      : join(root, 'goldie/out/agent-device/android', sourceLocale, 'phone');
    const files = SCENES.map(([id, file]) => ({
      id,
      path: join(sourceDir, `${file}.png`),
    }));
    return { device, locale: targetLocale, output: resolve(root, output, target, targetLocale), platform: target, files };
  }));
}

async function renderCell({ cell, root }) {
  await mkdir(dirname(cell.output), { recursive: true });
  const isolated = await mkdtemp(`${cell.output}-`);
  const configPath = join(isolated, 'goldie.config.mjs');
  const baseConfig = pathToFileURL(join(root, 'goldie/goldie.config.ts')).href;
  const sceneIds = JSON.stringify(cell.files.map(({ id }) => id));
  await writeFile(configPath, `import base from ${JSON.stringify(baseConfig)};
const selected = base.scenes.filter(({ id }) => ${sceneIds}.includes(id));
const calendar = Object.assign({}, selected.find(({ id }) => id === 'insights'), { id: 'insights-calendar' });
export default { ...base, devices: [${JSON.stringify(cell.device)}], locales: [${JSON.stringify(cell.locale)}], scenes: [...selected, calendar] };
`);
  const loaded = await goldie.loadConfig(configPath);
  await mkdir(join(loaded.outDir, 'raw', cell.device), { recursive: true });
  await writeFile(join(loaded.outDir, 'raw', cell.device, 'manifest.json'), JSON.stringify({
    device: cell.device,
    locale: cell.locale,
    screenshots: cell.files.map(({ id, path }) => ({ sceneId: id, file: path })),
    preview: null,
  }));
  if (cell.files.some(({ path }) => !existsSync(path))) {
    throw new Error(`Missing native capture for ${cell.platform} / ${cell.locale}.`);
  }
  await goldie.renderScreenshots(loaded, cell.device, cell.locale);
  return { isolated, output: loaded.outDir, platform: cell.platform, locale: cell.locale, device: cell.device, scenes: cell.files.map(({ id }) => id) };
}

export async function renderNativeCaptures(options) {
  const plan = buildRenderPlan(options);
  const results = [];
  async function renderNext(index) {
    if (index >= plan.length) return;
    results.push(await renderCell({ cell: plan[index], root: options.root }));
    return renderNext(index + 1);
  }
  await renderNext(0);
  const reportPath = resolve(options.root, options.output, 'render-report.json');
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify({ captureMode: 'native-input-frame-only', results }, null, 2)}\n`);
  return { reportPath, results };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  renderNativeCaptures(parseArguments(process.argv.slice(2))).then(({ reportPath }) => {
    console.log(`Native frame report: ${reportPath}`);
    return reportPath;
  }).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
