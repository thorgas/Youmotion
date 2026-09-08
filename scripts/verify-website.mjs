import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFile(resolve(root, path), 'utf8');
const pages = await Promise.all(['website/index.html', 'website/de/index.html'].map(read));
const script = await read('website/assets/pulse.js');
const headers = await read('website/_headers');

for (const page of pages) {
  if (!page.includes('data-store-state="coming-soon"')) throw new Error('Store links must remain in coming-soon mode before launch.');
  if (!page.includes('src="/assets/pulse.js"')) throw new Error('Each localized homepage must load the pulse interaction.');
  if (!page.includes('class="section product-story"')) throw new Error('Each homepage must keep the screenshot story below the pulse.');
  const emotions = [...page.matchAll(/data-emotion="([^"]+)"/g)].map((match) => match[1]);
  if (emotions.length !== 7 || new Set(emotions).size !== 7) throw new Error('Each pulse must expose seven unique emotion controls.');
  if (/<script(?![^>]*\bsrc=)/i.test(page) || /\son[a-z]+=/i.test(page)) throw new Error('Website pages must not use inline scripts or event handlers.');
  if (!page.includes('class="pointer-instruction"') || !page.includes('class="touch-instruction"')) throw new Error('Each homepage must explain desktop and touch interaction separately.');
}

if (!headers.includes("script-src 'self'")) throw new Error('The website CSP must restrict scripts to the same origin.');
if (/localStorage|sessionStorage|document\.cookie/.test(script)) throw new Error('The pulse must not persist visitor emotion data.');
for (const behavior of ['pointerdown', 'setPointerCapture', 'pointerup', 'pointercancel', 'directTouch', 'scrollToDownload']) {
  if (!script.includes(behavior)) throw new Error(`The responsive pulse interaction is missing ${behavior}.`);
}
if (!script.includes('distance > hitRadius')) throw new Error('The pulse must reject interaction outside its circular hit area.');
if (!script.includes('distance * progress')) throw new Error('Mobile scrolling must use constant-speed progress.');
if (!script.includes('apps.apple.com/app/id6807357236') || !script.includes('play.google.com/store/apps/details?id=com.youmotion.mobile')) throw new Error('Canonical future store destinations are missing.');

console.log('Website structure, launch state, privacy boundary, and store destinations verified.');
