import { createDb, createSessionQueries, createUserQueries } from '@par/db';
import { switchAccountSchema, type BrowserAccounts } from '@par/shared';
import type { Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';

import type { AppEnv } from '../../../env';
import { readSessionCookie, setSessionCookie } from '../../../lib/session-cookie';
import { recordAudit } from '../../../lib/audit';
import { hashToken } from '../../../lib/tokens';

const PREFIX = '__Host-par_account_';
const LIMIT = 20;

/** Authentication cookies only: opaque tokens never enter JavaScript or preferences. */
function saved(c: Context<AppEnv>): Map<string, string> {
  return new Map(
    Object.entries(getCookie(c))
      .filter(
        ([name]) =>
          name.startsWith(PREFIX) &&
          switchAccountSchema.safeParse({ id: name.slice(PREFIX.length) }).success,
      )
      .map(([name, token]) => [name.slice(PREFIX.length), token]),
  );
}

function clear(c: Context<AppEnv>, id: string): void {
  deleteCookie(c, `${PREFIX}${id}`, { path: '/', secure: true });
}

async function resolve(c: Context<AppEnv>, token: string, id?: string) {
  const db = createDb(c.env.DB);
  const session = await createSessionQueries(db).findByTokenHash(await hashToken(token));
  if (!session || session.expiresAt <= new Date().toISOString()) return null;
  if (id && session.userId !== id) return null;
  const user = await createUserQueries(db).findById(session.userId);
  return user?.status === 'ACTIVE' ? { session, user, token } : null;
}

function store(c: Context<AppEnv>, id: string, token: string, expiresAt: string): void {
  if (!switchAccountSchema.safeParse({ id }).success) return;
  setCookie(c, `${PREFIX}${id}`, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: Math.max(0, Math.floor((Date.parse(expiresAt) - Date.now()) / 1000)),
  });
}

/** Called by both password and Google sign-in, only after credentials succeed. */
export async function saveBrowserSession(
  c: Context<AppEnv>,
  id: string,
  token: string,
  expiresAt: string,
): Promise<void> {
  const entries = saved(c);
  const previousToken = readSessionCookie(c);
  const previous = previousToken ? await resolve(c, previousToken) : null;
  if (previous && previous.user.id !== id) {
    store(c, previous.user.id, previous.token, previous.session.expiresAt);
    entries.set(previous.user.id, previous.token);
  }
  // ponytail: cap at 20 auth cookies; use a server-side device bundle if more are needed.
  entries.delete(id);
  while (entries.size >= LIMIT) {
    const oldest = entries.keys().next().value!;
    clear(c, oldest);
    entries.delete(oldest);
  }
  store(c, id, token, expiresAt);
}

export async function listBrowserAccounts(c: Context<AppEnv>): Promise<BrowserAccounts> {
  const entries = saved(c);
  const activeToken = readSessionCookie(c);
  const active = activeToken ? await resolve(c, activeToken) : null;
  if (active) entries.set(active.user.id, active.token);
  const accounts: BrowserAccounts['accounts'] = [];
  for (const [id, token] of [...entries].slice(0, LIMIT)) {
    const valid = await resolve(c, token, id);
    if (!valid) continue;
    accounts.push({
      id,
      name: valid.user.fullName,
      email: valid.user.email,
      active: active?.user.id === id,
    });
  }
  return { accounts };
}

/** A valid saved cookie, not a remembered identity, is the authority to switch. */
export async function switchBrowserAccount(c: Context<AppEnv>, id: string): Promise<boolean> {
  const token = saved(c).get(id);
  const target = token ? await resolve(c, token, id) : null;
  if (!target) return false;
  await recordAudit(c, {
    actorUserId: target.user.id,
    actorRole: target.user.role,
    action: 'LOGIN',
    entityType: 'user',
    entityId: target.user.id,
    comment: 'Switched to a saved browser session.',
  });
  // Preserve the current account before replacing the active cookie (upgrade path).
  const previousToken = readSessionCookie(c);
  const previous = previousToken ? await resolve(c, previousToken) : null;
  if (previous && previous.user.id !== id) {
    store(c, previous.user.id, previous.token, previous.session.expiresAt);
  }
  await createSessionQueries(createDb(c.env.DB)).touch(target.session.id, new Date().toISOString());
  setSessionCookie(
    c,
    token!,
    Math.floor((Date.parse(target.session.expiresAt) - Date.now()) / 1000),
  );
  return true;
}

/** Forget and logout revoke only this browser's session, not every session for that user. */
export async function forgetBrowserAccount(c: Context<AppEnv>, id: string): Promise<void> {
  const token = saved(c).get(id);
  if (token) {
    const valid = await resolve(c, token, id);
    if (valid)
      await createSessionQueries(createDb(c.env.DB)).deleteByTokenHash(await hashToken(token));
  }
  clear(c, id);
}

export function clearSavedBrowserSession(c: Context<AppEnv>, token: string): void {
  for (const [id, savedToken] of saved(c)) {
    if (savedToken === token) clear(c, id);
  }
}
