import { createDb, createUserQueries, type NewUserRow, type UserRow } from '@par/db';
import type { Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { z } from 'zod';

import type { AppEnv } from '../../../env';
import { recordAudit } from '../../../lib/audit';
import { createId } from '../../../lib/ids';
import { hashPassword } from '../../../lib/password';
import { createOpaqueToken } from '../../../lib/tokens';
import { isAllowedDomain } from '../domain/email-domain';
import {
  buildGoogleAuthUrl,
  decodeStateCookie,
  desktopRedirect,
  encodeStateCookie,
  googleLandingPath,
  parseDesktopStart,
  type DesktopStart,
} from '../domain/google';
import { isBootstrapAdmin, parseAllowedDomains, parseBootstrapAdmins } from './config';
import { issueSession } from './session-issue';

export const GOOGLE_STATE_COOKIE = 'par_google_state';

const STATE_TTL_SECONDS = 600;
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v3/userinfo';

const googleUserSchema = z.object({
  email: z.email(),
  email_verified: z.boolean().optional(),
  name: z.string().optional(),
});

export type GoogleFailure =
  | 'google_unavailable'
  | 'google_cancelled'
  | 'google_state'
  | 'google_domain'
  | 'google_disabled'
  | 'google_failed';

export type GoogleOutcome =
  { ok: true; path: string } | { ok: false; code: GoogleFailure; path: string };

function callbackUrl(c: Context<AppEnv>): string {
  return new URL('/api/v1/auth/google/callback', new URL(c.req.url).origin).toString();
}

function failed(code: GoogleFailure, desktop: DesktopStart | null): GoogleOutcome {
  return {
    ok: false,
    code,
    path: desktop ? desktopRedirect(desktop, { error: code }) : `/login?error=${code}`,
  };
}

/** Issues the session where the shell can collect it: a cookie or the loopback token. */
async function signedIn(
  c: Context<AppEnv>,
  user: UserRow,
  now: string,
  desktop: DesktopStart | null,
): Promise<GoogleOutcome> {
  if (!desktop) {
    await issueSession(c, user, now);
    return { ok: true, path: googleLandingPath(user.status) };
  }

  const token = await issueSession(c, user, now, { cookie: false });
  return { ok: true, path: desktopRedirect(desktop, { token }) };
}

/** Redirects the browser to Google with a single-use state cookie (spec 7.4). */
export function startGoogleSignIn(c: Context<AppEnv>): Response {
  const query = c.req.query();
  const desktop = parseDesktopStart(query);
  if (query.client === 'desktop' && !desktop) return c.redirect('/login?error=google_failed');

  const clientId = c.env.GOOGLE_CLIENT_ID;
  const clientSecret = c.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return c.redirect('/login?error=google_unavailable');

  const state = createOpaqueToken();
  setCookie(c, GOOGLE_STATE_COOKIE, encodeStateCookie(state, desktop), {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: STATE_TTL_SECONDS,
  });

  return c.redirect(buildGoogleAuthUrl({ clientId, redirectUri: callbackUrl(c), state }));
}

/**
 * Redeems the authorization code, then signs in the matching account. Google has
 * already verified the address, so a new account starts at `PENDING_ROLE` and an
 * unverified one is promoted, exactly as the emailed verification link would.
 */
export async function completeGoogleSignIn(c: Context<AppEnv>): Promise<GoogleOutcome> {
  const { state: expectedState, desktop } = decodeStateCookie(
    getCookie(c, GOOGLE_STATE_COOKIE) ?? '',
  );
  deleteCookie(c, GOOGLE_STATE_COOKIE, { path: '/' });

  const query = c.req.query();
  if (query.error) return failed('google_cancelled', desktop);
  if (!query.code || !query.state) return failed('google_failed', desktop);
  if (!expectedState || query.state !== expectedState) return failed('google_state', desktop);

  const clientId = c.env.GOOGLE_CLIENT_ID;
  const clientSecret = c.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return failed('google_unavailable', desktop);

  const profile = await exchangeCode(c, query.code, clientId, clientSecret);
  if (!profile) return failed('google_failed', desktop);

  if (!isAllowedDomain(profile.email, parseAllowedDomains(c.env.ALLOWED_EMAIL_DOMAINS))) {
    return failed('google_domain', desktop);
  }

  const db = createDb(c.env.DB);
  const users = createUserQueries(db);
  const now = new Date().toISOString();
  const existing = await users.findByEmail(profile.email);

  if (!existing) {
    // Google accounts have no local password. A random one keeps the column
    // non-null; password reset is the only path that can set a usable one.
    const { hash, params } = await hashPassword(createOpaqueToken());
    // Google has already verified the address, so a bootstrap admin is active now.
    const bootstrap = isBootstrapAdmin(
      profile.email,
      parseBootstrapAdmins(c.env.BOOTSTRAP_ADMIN_EMAILS),
    );
    const row: NewUserRow = {
      id: createId(),
      email: profile.email,
      passwordHash: hash,
      hashParams: params,
      fullName: profile.name || profile.email.split('@')[0]!,
      role: bootstrap ? 'ADMIN' : null,
      status: bootstrap ? 'ACTIVE' : 'PENDING_ROLE',
      emailVerifiedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    await users.insert(row);
    const created = await users.findById(row.id);
    if (!created) return failed('google_failed', desktop);

    const outcome = await signedIn(c, created, now, desktop);
    await recordAudit(c, {
      actorUserId: created.id,
      actorRole: null,
      action: 'REGISTER',
      entityType: 'user',
      entityId: created.id,
    });

    return outcome;
  }

  if (existing.status === 'DISABLED') return failed('google_disabled', desktop);

  const patch: Partial<NewUserRow> = { lastSignedInAt: now };
  if (!existing.emailVerifiedAt) patch.emailVerifiedAt = now;
  if (
    existing.role !== 'ADMIN' &&
    isBootstrapAdmin(existing.email, parseBootstrapAdmins(c.env.BOOTSTRAP_ADMIN_EMAILS))
  ) {
    patch.role = 'ADMIN';
    patch.status = 'ACTIVE';
  } else if (existing.status === 'PENDING_VERIFICATION') {
    patch.status = existing.role === null ? 'PENDING_ROLE' : 'ACTIVE';
  }

  const updated = await users.update(existing.id, patch, now);
  if (!updated) return failed('google_failed', desktop);
  const outcome = await signedIn(c, updated, now, desktop);
  await recordAudit(c, {
    actorUserId: existing.id,
    actorRole: existing.role,
    action: 'LOGIN',
    entityType: 'user',
    entityId: existing.id,
  });

  return outcome;
}

/** Exchanges the code and reads the profile; the code and secret never leave here. */
async function exchangeCode(
  c: Context<AppEnv>,
  code: string,
  clientId: string,
  clientSecret: string,
): Promise<{ email: string; name: string } | null> {
  try {
    const tokenResponse = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: callbackUrl(c),
        grant_type: 'authorization_code',
      }),
    });
    if (!tokenResponse.ok) return null;

    const token = (await tokenResponse.json()) as { access_token?: string };
    if (!token.access_token) return null;

    const infoResponse = await fetch(USERINFO_ENDPOINT, {
      headers: { authorization: `Bearer ${token.access_token}` },
    });
    if (!infoResponse.ok) return null;

    const parsed = googleUserSchema.safeParse(await infoResponse.json());
    if (!parsed.success || !parsed.data.email_verified) return null;

    return {
      email: parsed.data.email.trim().toLowerCase(),
      name: parsed.data.name?.trim() ?? '',
    };
  } catch {
    return null;
  }
}
