import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync('package.json', 'utf8'));
const eas = JSON.parse(readFileSync('eas.json', 'utf8'));
const scripts = manifest.scripts;
for (const [name, command] of Object.entries(scripts)) {
  for (const match of command.matchAll(/(?:node|bash) (scripts\/[^\s]+)/g)) {
    assert(existsSync(match[1]), `${name}: missing ${match[1]}`);
  }
  for (const match of command.matchAll(/\bpnpm (?!exec\b|dlx\b)([\w:-]+)/g)) {
    assert(Object.hasOwn(scripts, match[1]), `${name}: unknown script ${match[1]}`);
  }
  const profile = command.match(/eas (build|submit)\b.*--profile ([\w-]+)/);
  if (profile) assert(Object.hasOwn(eas[profile[1]], profile[2]), `${name}: unknown EAS profile ${profile[2]}`);
  if (/eas update --channel/.test(command)) {
    assert(/--environment (development|preview|production)\b/.test(command), `${name}: SDK 57 OTA publication requires an explicit environment`);
  }
}
for (const file of ['README.md', 'BUILD.md', 'docs/testing/appduct-e2e.md']) {
  const text = readFileSync(file, 'utf8');
  for (const match of text.matchAll(/\bpnpm (?!exec\b|dlx\b|install\b|version\b|--)([\w:-]+)/g)) {
    if (!match[1].includes(':') && !['start', 'ios', 'android', 'web', 'lint', 'test', 'verify', 'preios'].includes(match[1])) continue;
    assert(Object.hasOwn(scripts, match[1]), `${file}: unknown documented script ${match[1]}`);
  }
}
const audit = readFileSync('docs/testing/package-command-audit.md', 'utf8');
for (const name of Object.keys(scripts)) {
  assert(audit.includes(`| \`${name}\` |`), `Command audit is missing ${name}`);
}
console.log(`Verified ${Object.keys(scripts).length} package scripts, EAS profiles, and documented commands.`);
