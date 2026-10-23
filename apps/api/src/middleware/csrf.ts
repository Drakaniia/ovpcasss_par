import { createMiddleware } from 'hono/factory';
import { getCookie } from 'hono/cookie';

import type { AppEnv } from '../env';
import { isTrustedProxy } from '../lib/request-context';
import { SESSION_COOKIE } from '../lib/session-cookie';

/**
 * CSRF guard for cookie-authenticated mutations (spec §10). SameSite=Lax already
 * blocks cross-site form posts; this origin check closes the rest. A request
 * that carries the session cookie must present a matching `Origin`; the desktop
 * bearer flow sends no cookie and is untouched.
 *
 * The Pages site is same-origin from the browser's point of view but its request
 * reaches the Worker from a proxy, with the proxy's host and possibly no `Origin`
 * at all, so the shared `PROXY_TOKEN` stands in for that match. A cross-site post
 * still carries no cookie (SameSite=Lax), which is what this guard protects.
 */
export const requireSameOrigin = createMiddleware<AppEnv>(async (c, next) => {
  if (isReadOnly(c.req.method)) return next();
  if (getCookie(c, SESSION_COOKIE) === undefined) return next();
  if (isTrustedProxy(c)) return next();

  const origin = c.req.header('origin');
  const host = c.req.header('host');
  if (!origin || !host || !isSameHost(origin, host)) {
    return c.json({ error: { code: 'FORBIDDEN', message: 'Request origin not permitted' } }, 403);
  }

  await next();
});

function isReadOnly(method: string): boolean {
  return method === 'GET' || method === 'HEAD' || method === 'OPTIONS';
}

function isSameHost(origin: string, host: string): boolean {
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
