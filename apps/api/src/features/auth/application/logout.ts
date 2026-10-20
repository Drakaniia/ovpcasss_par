import { createDb, createSessionQueries } from '@par/db';
import type { Context } from 'hono';

import type { AppEnv } from '../../../env';
import { clearSessionCookie, readSessionCookie } from '../../../lib/session-cookie';
import { authorizationToken, hashToken } from '../../../lib/tokens';

/**
 * Clears the session (spec §7.4). The bearer token is the desktop path and the
 * cookie the browser path; either revokes the same session row. Idempotent.
 */
export async function logout(c: Context<AppEnv>): Promise<void> {
  const token = authorizationToken(c.req.header('authorization')) ?? readSessionCookie(c);
  if (token) {
    await createSessionQueries(createDb(c.env.DB)).deleteByTokenHash(await hashToken(token));
  }
  clearSessionCookie(c);
}
