import assert from 'node:assert/strict';
import { test } from 'node:test';

import { checkPages } from './check-pages.mjs';

const response = (body, status = 200) => Response.json(body, { status });
const healthy = async (url) => {
  switch (url.pathname) {
    case '/api/health':
      return response({ status: 'ok' });
    case '/api/v1/auth/config':
      return response({ googleEnabled: true });
    case '/api/v1/me':
      return response({ error: { code: 'UNAUTHORIZED' } }, 401);
    default:
      return new Response('<html>Sign in</html>', { headers: { 'content-type': 'text/html' } });
  }
};

test('accepts a working Pages proxy and sign-in page', async () => {
  await checkPages('https://example.pages.dev', healthy);
});

test('rejects HTTP 200 HTML masquerading as API health', async () => {
  await assert.rejects(
    checkPages(
      'https://example.pages.dev',
      async () => new Response('<html>SPA</html>', { headers: { 'content-type': 'text/html' } }),
    ),
    /expected JSON/,
  );
});

test('rejects HTML at auth config even when health works', async () => {
  await assert.rejects(
    checkPages('https://example.pages.dev', async (url) =>
      url.pathname === '/api/v1/auth/config'
        ? new Response('<html>SPA</html>', { headers: { 'content-type': 'text/html' } })
        : healthy(url),
    ),
    /expected JSON/,
  );
});
