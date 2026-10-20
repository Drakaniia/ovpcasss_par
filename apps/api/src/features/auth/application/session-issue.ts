import { createDb, createSessionQueries, type UserRow } from '@par/db';
import type { Context } from 'hono';

import type { AppEnv } from '../../../env';
import { createId } from '../../../lib/ids';
import { clientIp, clientUserAgent } from '../../../lib/request-context';
import { setSessionCookie, SESSION_TTL_SECONDS } from '../../../lib/session-cookie';
import { createOpaqueToken, hashToken } from '../../../lib/tokens';

/**
 * Creates the session row, plants the cookie, and returns the opaque token
 * (spec §7.4). Only the hash is stored; the caller never persists the token.
 * The desktop shell asks for no cookie and keeps the token in the OS store.
 */
export async function issueSession(
  c: Context<AppEnv>,
  user: UserRow,
  at: string,
  options: { cookie?: boolean } = {},
): Promise<string> {
  const token = createOpaqueToken();
  const expiresAt = new Date(Date.parse(at) + SESSION_TTL_SECONDS * 1000).toISOString();

  await createSessionQueries(createDb(c.env.DB)).insert({
    id: createId(),
    tokenHash: await hashToken(token),
    userId: user.id,
    expiresAt,
    lastSeenAt: at,
    userAgent: clientUserAgent(c),
    ip: clientIp(c),
    createdAt: at,
    updatedAt: at,
  });

  if (options.cookie !== false) setSessionCookie(c, token);
  return token;
}
