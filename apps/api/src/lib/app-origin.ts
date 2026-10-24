import type { Context } from 'hono';

import type { AppEnv } from '../env';
import { readSessionCookie } from './session-cookie';

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

/**
 * The address a client should send its own request to (spec §7.8). A browser
 * page names itself in `Origin` and carries the session cookie, and it must stay
 * on its own origin so the cookie is sent; a bearer-token client (the desktop
 * shell) calls this API directly, so the API's own origin is its address.
 * `APP_ORIGIN` is the published site, which is not necessarily the host that
 * served this request — a fallback URL built from it can land on a host with no
 * API and answer 405.
 */
export function resolveClientOrigin(
  requestUrl: string,
  originHeader: string | undefined,
  browserSession: boolean,
): string {
  const origin = browserSession ? httpOrigin(originHeader) : null;
  return origin ?? new URL(requestUrl).origin;
}

/** The header's origin when it is a usable web address; `null` (opaque) is not. */
function httpOrigin(value: string | undefined): string | null {
  try {
    const url = new URL(value ?? '');
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.origin : null;
  } catch {
    return null;
  }
}

export function clientOrigin(c: Context<AppEnv>): string {
  return resolveClientOrigin(c.req.url, c.req.header('origin'), readSessionCookie(c) !== undefined);
}
