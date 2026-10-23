import type { Context } from 'hono';

import type { AppEnv } from '../env';

/** Caller facts recorded on sessions and audit rows (spec §7.12). */

/**
 * The Pages site reaches this API through a Function, so the request's own URL
 * and peer are the proxy's, not the browser's. `PROXY_TOKEN` is the shared secret
 * that marks such a request; without it the headers below are just client input.
 */
export function isTrustedProxy(c: Context<AppEnv>): boolean {
  const token = c.env.PROXY_TOKEN;
  return Boolean(token) && c.req.header('x-par-proxy-token') === token;
}

export function clientIp(c: Context<AppEnv>): string | null {
  // Only the proxy may name the address: per-IP limits are a few attempts per
  // window, and every browser behind that proxy would otherwise share one bucket.
  const proxied = c.req.header('x-par-forwarded-for');
  if (proxied && isTrustedProxy(c)) return proxied;

  const forwarded = c.req.header('x-forwarded-for');
  return c.req.header('cf-connecting-ip') ?? forwarded?.split(',')[0]?.trim() ?? null;
}

export function clientUserAgent(c: Context<AppEnv>): string | null {
  return c.req.header('user-agent') ?? null;
}
