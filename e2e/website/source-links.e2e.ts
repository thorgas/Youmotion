import { test, expect } from 'e2e';
import { startWebsiteServer } from './server.mjs';

const sourceUrl = 'https://github.com/thorgas/Youmotion';
const routes = ['/', '/support/', '/privacy/app/', '/privacy/website/', '/terms/', '/imprint/', '/de/', '/de/support/', '/de/privacy/app/', '/de/privacy/website/', '/de/terms/', '/de/impressum/'];

let baseUrl = '';
let closeServer: (() => Promise<void>) | undefined;
test.beforeAll(async () => {
  const server = await startWebsiteServer({ routes });
  baseUrl = server.baseUrl;
  closeServer = () => server.close();
});
test.afterAll(async () => {
  await closeServer?.();
});

for (const route of routes) {
  test(`serves a localized source link on ${route}`, async () => {
    const response = await fetch(`${baseUrl}${route}`);
    expect(response.status).toBe(200);
    const html = await response.text();
    const footer = html.slice(html.indexOf('<footer'));
    expect(footer).toContain(`href="${sourceUrl}"`);
    expect(footer).toContain(route.startsWith('/de/') ? 'Quellcode' : 'Source code');
    expect(html).not.toContain('Youmotion is open source');
    expect(html).not.toContain('Youmotion ist Open Source');
  });
}

test('support keeps private contact separate from public contribution links', async () => {
  await Promise.all(['/support/', '/de/support/'].map(async (route) => {
    const response = await fetch(`${baseUrl}${route}`);
    const html = await response.text();
    expect(html).toContain('mailto:youmotion@thorgas.com');
    expect(html).toContain(`href="${sourceUrl}"`);
    expect(html).toContain(route.startsWith('/de/') ? 'Journal' : 'journal');
  }));
});

test('landing pages explain the source destination in the visitor language', async () => {
  await Promise.all([
    { route: '/', heading: 'Explore the source', label: 'Source code on GitHub' },
    { route: '/de/', heading: 'Ein Blick in den Quellcode', label: 'Quellcode auf GitHub' },
  ].map(async ({ route, heading, label }) => {
    const response = await fetch(`${baseUrl}${route}`);
    const html = await response.text();
    const section = html.match(/<section[^>]*id="source"[\s\S]*?<\/section>/)?.[0];
    expect(section).toContain(`<h2>${heading}</h2>`);
    expect(section).toContain(`<a href="${sourceUrl}">${label}</a>`);
  }));
});
