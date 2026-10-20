import { createDb, createSessionQueries, createUserQueries } from '@par/db';
import { createMiddleware } from 'hono/factory';

import type { AppEnv } from '../env';
import { readSessionCookie } from '../lib/session-cookie';
import { authorizationToken, hashToken } from '../lib/tokens';

/**
 * Resolves the session cookie or `Authorization: Bearer` token into `userId`
 * and `role` (spec §7.4). Only the token's hash reaches the database, so the
 * plaintext is never stored; the session must be unexpired and its account not
 * disabled. The middleware never rejects on its own — routes decide what an
 * authenticated caller may do — so one pipeline serves public and protected
 * routes alike.
 */
export const requireSession = createMiddleware<AppEnv>(async (c, next) => {
  const token = authorizationToken(c.req.header('authorization')) ?? readSessionCookie(c);

  if (token) {
    const now = new Date().toISOString();
    const db = createDb(c.env.DB);
    const sessions = createSessionQueries(db);
    const session = await sessions.findByTokenHash(await hashToken(token));

    if (session && session.expiresAt > now) {
      const user = await createUserQueries(db).findById(session.userId);

      if (user && user.status !== 'DISABLED') {
        c.set('userId', user.id);
        if (user.role) c.set('role', user.role);
        await sessions.touch(session.id, now);
      }
    }
  }

  await next();
});
