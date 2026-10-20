import type { Context } from 'hono';

import type { AppEnv } from '../env';

/** Caller facts recorded on sessions and audit rows (spec §7.12). */

export function clientIp(c: Context<AppEnv>): string | null {
  const forwarded = c.req.header('x-forwarded-for');
  return c.req.header('cf-connecting-ip') ?? forwarded?.split(',')[0]?.trim() ?? null;
}

export function clientUserAgent(c: Context<AppEnv>): string | null {
  return c.req.header('user-agent') ?? null;
}
