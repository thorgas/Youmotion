import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

export async function startWebsiteServer({ routes }) {
  const documents = new Map();
  await Promise.all(routes.map(async (route) => {
    documents.set(route, await readFile(resolve('website', `.${route}`, 'index.html'), 'utf8'));
  }));
  const server = createServer((request, response) => {
    const html = documents.get(request.url ?? '/');
    response.writeHead(html === undefined ? 404 : 200, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(html ?? 'Not found');
  });
  const listening = once(server, 'listening');
  server.listen(0, '127.0.0.1');
  await listening;
  const address = server.address();
  if (address === null || typeof address === 'string') {
    await promisify(server.close).call(server);
    throw new Error('Website test server requires a local TCP port.');
  }
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    async close() {
      await promisify(server.close).call(server);
    },
  };
}
