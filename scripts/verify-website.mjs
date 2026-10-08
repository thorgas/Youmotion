import { access, readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFile(resolve(root, path), 'utf8');
const pages = await Promise.all(['website/index.html', 'website/de/index.html'].map(read));
const script = await read('website/assets/pulse.js');
const headers = await read('website/_headers');
const websiteFonts = [
  'website/assets/instrument-sans-regular.ttf',
  'website/assets/instrument-sans-medium.ttf',
  'website/assets/instrument-sans-semibold.ttf',
];
const websiteBadges = [
  'website/assets/app-store-badge-en.svg',
  'website/assets/app-store-badge-de.svg',
  'website/assets/google-play-badge-en.svg',
  'website/assets/google-play-badge-de.svg',
];

const storeApple = 'https://apps.apple.com/app/id6807357236';
const storeGoogle = 'https://play.google.com/store/apps/details?id=com.youmotion.mobile';

for (const page of pages) {
  if (!page.includes('data-store-state="live"')) throw new Error('Store links must be live (data-store-state="live") after launch.');
  if (!page.includes(`data-store="apple" href="${storeApple}"`) || !page.includes(`data-store="google" href="${storeGoogle}"`)) throw new Error('Each homepage must link store badges to the public store URLs.');
  if (/aria-disabled="true"/.test(page) || /Coming soon|Bald verfügbar/.test(page)) throw new Error('Store badges must not be disabled or claim the app is coming soon.');
  if (!page.includes('src="/assets/pulse.js"')) throw new Error('Each localized homepage must load the pulse interaction.');
  if (!page.includes('class="section product-story"')) throw new Error('Each homepage must keep the screenshot story below the pulse.');
  const emotions = [...page.matchAll(/data-emotion="([^"]+)"/g)].map((match) => match[1]);
  if (emotions.length !== 7 || new Set(emotions).size !== 7) throw new Error('Each pulse must expose seven unique emotion controls.');
  if (/<script(?![^>]*\bsrc=)/i.test(page) || /\son[a-z]+=/i.test(page)) throw new Error('Website pages must not use inline scripts or event handlers.');
  if (!page.includes('class="pointer-instruction"') || !page.includes('class="touch-instruction"')) throw new Error('Each homepage must explain desktop and touch interaction separately.');
}

if (!headers.includes("script-src 'self'")) throw new Error('The website CSP must restrict scripts to the same origin.');
const websiteStyles = await read('website/assets/site.css');
if (!websiteStyles.includes('font-family: "Instrument Sans"')) throw new Error('The website must use the app’s Instrument Sans family.');
await Promise.all([...websiteFonts, ...websiteBadges].map((path) => access(resolve(root, path))));
if (/localStorage|sessionStorage|document\.cookie/.test(script)) throw new Error('The pulse must not persist visitor emotion data.');
for (const behavior of ['pointerdown', 'setPointerCapture', 'pointerup', 'pointercancel', 'directTouch', 'scrollToDownload']) {
  if (!script.includes(behavior)) throw new Error(`The responsive pulse interaction is missing ${behavior}.`);
}
if (!script.includes('distance > hitRadius')) throw new Error('The pulse must reject interaction outside its circular hit area.');
if (!script.includes('distance * progress')) throw new Error('Mobile scrolling must use constant-speed progress.');
if (!script.includes('apps.apple.com/app/id6807357236') || !script.includes('play.google.com/store/apps/details?id=com.youmotion.mobile')) throw new Error('Canonical store destinations are missing.');

const sourceUrl = 'https://github.com/thorgas/Youmotion';
const files = await readdir(resolve(root, 'website'), { recursive: true });
const htmlPaths = files.filter((path) => path.endsWith('index.html'));
if (htmlPaths.length !== 12) throw new Error('Source-link coverage must include all 12 website pages.');
function verifySupportSource({ page, path, german, anchor }) {
    const main = page.match(/<main\b[\s\S]*?<\/main>/)?.[0];
    const heading = german ? 'Quellcode und Beiträge' : 'Source and contributions';
    if (!main?.includes(anchor) || !main.includes(`<h2>${heading}</h2>`)) throw new Error(`${path}: support contribution section is missing.`);
    if (!main.includes('mailto:youmotion@thorgas.com')) throw new Error(`${path}: source link must preserve personal email support.`);
}
await Promise.all(htmlPaths.map(async (path) => {
  const page = await read(`website/${path}`);
  const german = path.startsWith('de/');
  const label = german ? 'Quellcode auf GitHub' : 'Source code on GitHub';
  const anchor = `<a href="${sourceUrl}">${label}</a>`;
  const footer = page.match(/<footer\b[\s\S]*?<\/footer>/)?.[0];
  if (!footer?.includes(anchor)) throw new Error(`${path}: footer source link is missing or incorrectly localized.`);
  if (path === 'index.html' || path === 'de/index.html') {
    const section = page.match(/<section[^>]*id="source"[\s\S]*?<\/section>/)?.[0];
    if (!section?.includes(anchor)) throw new Error(`${path}: landing source section is missing.`);
  }
  if (path.includes('support/')) verifySupportSource({ page, path, german, anchor });
}));
const config = JSON.parse(await read('store.config.json'));
await Promise.all([
  ['en-US', 'SOURCE CODE', 'Project source and contributions:'],
  ['de-DE', 'QUELLCODE', 'Projektquellcode und Beiträge:'],
].map(async ([locale, heading, copy]) => {
  const section = `${heading}\n\n${copy} ${sourceUrl}`;
  const apple = config.apple.info[locale].description;
  const google = (await read(`store/automation/google-play/metadata/${locale}/full_description.txt`)).trim();
  if (!apple.includes(section) || !google.includes(section)) throw new Error(`${locale}: localized store source section is missing.`);
  if (apple.length > 4000 || google.length > 4000) throw new Error(`${locale}: full description exceeds the store limit.`);
  await Promise.all([['apple', apple], ['google-play', google]].map(async ([platform, description]) => {
    const doc = await read(`store/metadata/${platform}/${locale}.md`);
    const title = platform === 'apple' ? (locale === 'en-US' ? 'Description' : 'Beschreibung') : (locale === 'en-US' ? 'Full description' : 'Vollständige Beschreibung');
    const body = doc.split(`## ${title}\n\n`)[1]?.split('\n## ')[0]?.trim();
    if (body !== description) throw new Error(`${platform}/${locale}: documented description differs from upload source.`);
  }));
}));
console.log('Website structure, launch state, privacy boundary, store destinations, and localized source links verified.');
