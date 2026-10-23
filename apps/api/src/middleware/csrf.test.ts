import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';

import type { AppEnv } from '../env';
import { requireSameOrigin } from './csrf';

const TOKEN = 'proxy-secret';
const app = new Hono<AppEnv>();

app.use('*', requireSameOrigin);
app.post('/reports', (c) => c.json({ ok: true }));
app.get('/reports', (c) => c.json({ ok: true }));

function bindings(proxyToken?: string) {
  return { PROXY_TOKEN: proxyToken } as unknown as AppEnv['Bindings'];
}

/** A cookie-bearing write, as the browser sends it. */
function submit(headers: Record<string, string> = {}, proxyToken?: string) {
  return app.request(
    '/reports',
    { method: 'POST', headers: { cookie: 'par_session=abc', ...headers } },
    bindings(proxyToken),
  );
}

describe('requireSameOrigin', () => {
  it('lets a same-host write through', async () => {
    const response = await submit({
      origin: 'https://par.ovpcassss.workers.dev',
      host: 'par.ovpcassss.workers.dev',
    });

    expect(response.status).toBe(200);
  });

  it('refuses a write from another origin', async () => {
    const response = await submit({
      origin: 'https://evil.example',
      host: 'par.ovpcassss.workers.dev',
    });

    expect(response.status).toBe(403);
  });

  it('lets the trusted proxy write through without an Origin header', async () => {
    const response = await submit({ 'x-par-proxy-token': TOKEN }, TOKEN);

    expect(response.status).toBe(200);
  });

  it('refuses a proxy header that does not match the configured token', async () => {
    const response = await submit(
      { origin: 'https://evil.example', 'x-par-proxy-token': 'guessed' },
      TOKEN,
    );

    expect(response.status).toBe(403);
  });

  it('ignores the proxy header when no token is configured', async () => {
    const response = await submit({ 'x-par-proxy-token': TOKEN });

    expect(response.status).toBe(403);
  });

  it('leaves reads alone', async () => {
    const response = await app.request(
      '/reports',
      { headers: { cookie: 'par_session=abc', origin: 'https://evil.example' } },
      bindings(TOKEN),
    );

    expect(response.status).toBe(200);
  });
});
