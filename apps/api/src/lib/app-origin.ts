import type { Context } from 'hono';

import type { AppEnv } from '../env';

/**
 * The address the browser uses for the app (spec §7.1). The Pages site reaches
 * this API through its `/api/*` proxy, so a request's own URL names the Worker;
 * mail links, receipts, and the Google redirect URI must name Pages instead.
 * Trailing slashes are dropped because templates concatenate the origin.
 */
export function resolveAppOrigin(configured: string | undefined, requestUrl: string): string {
  const origin = configured?.trim() ? configured.trim() : new URL(requestUrl).origin;
  return origin.replace(/\/+$/, '');
}

export function appOrigin(c: Context<AppEnv>): string {
  return resolveAppOrigin(c.env.APP_ORIGIN, c.req.url);
}
