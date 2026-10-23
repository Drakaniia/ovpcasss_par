import {
  createAuditQueries,
  createDb,
  createEmailOutboxQueries,
  createInboxQueries,
  createNotificationQueries,
  createUserQueries,
} from '@par/db';
import { Hono, type Context } from 'hono';

import type { AppEnv } from '../../env';
import { requireSession } from '../../middleware/auth';
import { buildInbox } from './application/build-inbox';

/**
 * The signed-in account's work inbox (UI spec §7.3). Mounted at `/me`, so the
 * route is `/me/inbox`; the recipient is always the session's user, never a path
 * parameter. Every section is built from the same reads the lists and queues
 * use, so a count on Home always matches the queue it links to.
 */
export const inboxRoutes = new Hono<AppEnv>();

inboxRoutes.use('*', requireSession);

inboxRoutes.get('/inbox', async (c) => {
  const userId = c.get('userId');
  if (!userId) return unauthorized(c);

  const db = createDb(c.env.DB);
  const queries = {
    users: createUserQueries(db),
    emailOutbox: createEmailOutboxQueries(db),
    audit: createAuditQueries(db),
    inbox: createInboxQueries(db),
    notifications: createNotificationQueries(db),
  };

  const user = await queries.users.findById(userId);
  if (!user) return unauthorized(c);

  return c.json(await buildInbox(queries, user));
});

function unauthorized(c: Context<AppEnv>) {
  return c.json({ error: { code: 'UNAUTHORIZED', message: 'Sign in to view your inbox' } }, 401);
}
