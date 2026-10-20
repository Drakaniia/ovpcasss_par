import type { Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';

import type { AppEnv } from '../env';

/**
 * The web session cookie (spec §7.4): `HttpOnly; Secure; SameSite=Lax`, scoped
 * to the whole site. Desktop keeps its bearer token in the OS store instead, so
 * the token also travels out of band there; the cookie is only the browser path.
 */
export const SESSION_COOKIE = 'par_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

export function readSessionCookie(c: Context<AppEnv>): string | undefined {
  return getCookie(c, SESSION_COOKIE);
}

export function setSessionCookie(c: Context<AppEnv>, token: string): void {
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearSessionCookie(c: Context<AppEnv>): void {
  deleteCookie(c, SESSION_COOKIE, { path: '/' });
}
