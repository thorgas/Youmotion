import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const manifestPath = join(repositoryRoot, 'store/screenshots/provenance.json');
const trackedRoots = [
  'store/screenshots/google-play',
  'store/screenshots/ios',
  'website/assets',
];

async function pngFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return pngFiles(path);
    return extname(entry.name).toLowerCase() === '.png' ? [path] : [];
  }));
  return nested.flat();
}

function pngDimensions(bytes) {
  const signature = '89504e470d0a1a0a';
  if (bytes.subarray(0, 8).toString('hex') !== signature) {
    throw new Error('not a PNG');
  }
  return { height: bytes.readUInt32BE(20), width: bytes.readUInt32BE(16) };
}

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const failures = [];
const inventory = (await Promise.all(trackedRoots.map((root) => pngFiles(join(repositoryRoot, root)))))
  .flat()
  .map((assetPath) => relative(repositoryRoot, assetPath))
  .toSorted();
const declared = manifest.assets.map((asset) => asset.path).toSorted();

for (const missingPath of inventory.filter((candidatePath) => !declared.includes(candidatePath))) {
  failures.push(`${missingPath}: missing from provenance manifest`);
}
for (const absentPath of declared.filter((candidatePath) => !inventory.includes(candidatePath))) {
  failures.push(`${absentPath}: declared but not present`);
}

const assetChecks = manifest.assets.map(async (asset) => {
  if (!inventory.includes(asset.path)) return;
  const bytes = await readFile(join(repositoryRoot, asset.path));
  const dimensions = pngDimensions(bytes);
  const hash = createHash('sha256').update(bytes).digest('hex');
  if (dimensions.width !== asset.width || dimensions.height !== asset.height) {
    failures.push(`${asset.path}: expected ${asset.width}x${asset.height}, found ${dimensions.width}x${dimensions.height}`);
  }
  if (hash !== asset.sha256) failures.push(`${asset.path}: content changed without a provenance update`);
  if (!asset.approved) failures.push(`${asset.path}: awaiting visual approval against the signed release build`);
  if (asset.captureCommit !== manifest.releaseCommit) {
    failures.push(`${asset.path}: capture commit does not match release commit ${manifest.releaseCommit}`);
  }
  if ((asset.screen === 'history' || asset.screen === 'insights') && asset.fixtureMoments !== 133) {
    failures.push(`${asset.path}: ${asset.screen} must use the committed 133-moment fixture`);
  }
});
await Promise.all(assetChecks);

if (failures.length > 0) {
  console.error(`Store screenshot provenance failed (${failures.length} findings):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Verified ${manifest.assets.length} approved screenshot assets for ${manifest.releaseCommit}.`);
}
