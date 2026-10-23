import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';

import type { AppEnv } from '../env';
import { clientIp, isTrustedProxy } from './request-context';

const TOKEN = 'proxy-secret';
const app = new Hono<AppEnv>();

app.get('/ip', (c) => c.json({ ip: clientIp(c), trusted: isTrustedProxy(c) }));

function bindings(proxyToken?: string) {
  return { PROXY_TOKEN: proxyToken } as unknown as AppEnv['Bindings'];
}

async function caller(headers: Record<string, string>, proxyToken?: string) {
  const response = await app.request('/ip', { headers }, bindings(proxyToken));
  return (await response.json()) as { ip: string | null; trusted: boolean };
}

describe('clientIp', () => {
  it('prefers the peer address Cloudflare sets', async () => {
    await expect(
      caller({ 'cf-connecting-ip': '203.0.113.9', 'x-forwarded-for': '198.51.100.4' }),
    ).resolves.toEqual({ ip: '203.0.113.9', trusted: false });
  });

  it('reads the forwarded address from the trusted proxy', async () => {
    await expect(
      caller(
        {
          'x-par-forwarded-for': '203.0.113.9',
          'x-par-proxy-token': TOKEN,
          'cf-connecting-ip': '10.0.0.1',
        },
        TOKEN,
      ),
    ).resolves.toEqual({ ip: '203.0.113.9', trusted: true });
  });

  it('ignores a forwarded address the proxy did not vouch for', async () => {
    await expect(
      caller({ 'x-par-forwarded-for': '203.0.113.9', 'x-par-proxy-token': 'guessed' }, TOKEN),
    ).resolves.toEqual({ ip: null, trusted: false });
  });

  it('ignores the forwarded address when no token is configured', async () => {
    await expect(
      caller({ 'x-par-forwarded-for': '203.0.113.9', 'x-par-proxy-token': TOKEN }),
    ).resolves.toEqual({ ip: null, trusted: false });
  });
});
