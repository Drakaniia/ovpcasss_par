import { Hono, type Context } from 'hono';

import { createDb } from '@par/db';
import { notificationQuerySchema } from '@par/shared';

import type { AppEnv } from '../../env';
import { requireSession } from '../../middleware/auth';
import {
  countUnreadNotifications,
  listNotifications,
  readAllNotifications,
  readNotification,
} from './application/notification-inbox';
import { createNotificationRepository } from './infrastructure/notification-repository';

/**
 * The reader's own inbox (UI spec §7.13). It is a sub-resource of `/me`, so
 * `app.ts` merges it onto the same base as the profile routes (spec §7.3). No
 * route accepts a user id: the recipient is always the session's.
 */
export const notificationRoutes = new Hono<AppEnv>();

notificationRoutes.use('*', requireSession);

function repository(c: Context<AppEnv>) {
  return createNotificationRepository(createDb(c.env.DB));
}

notificationRoutes.get('/notifications', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json(
      { error: { code: 'UNAUTHORIZED', message: 'Sign in to view notifications' } },
      401,
    );
  }

  const query = notificationQuerySchema.safeParse(c.req.query());
  if (!query.success) {
    return c.json(
      {
        error: {
          code: 'INVALID_QUERY',
          message: 'That notification filter is not supported',
          details: query.error.issues,
        },
      },
      400,
    );
  }

  return c.json(await listNotifications(repository(c), userId, query.data));
});

notificationRoutes.get('/notifications/unread-count', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json(
      { error: { code: 'UNAUTHORIZED', message: 'Sign in to view notifications' } },
      401,
    );
  }

  return c.json(await countUnreadNotifications(repository(c), userId));
});

/** Marks every unread row read; the client shows no confirm (phase 11 §3). */
notificationRoutes.post('/notifications/read-all', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json(
      { error: { code: 'UNAUTHORIZED', message: 'Sign in to view notifications' } },
      401,
    );
  }

  return c.json(await readAllNotifications(repository(c), userId, new Date().toISOString()));
});

notificationRoutes.post('/notifications/:id/read', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json(
      { error: { code: 'UNAUTHORIZED', message: 'Sign in to view notifications' } },
      401,
    );
  }

  const result = await readNotification(
    repository(c),
    userId,
    c.req.param('id'),
    new Date().toISOString(),
  );

  if (!result) {
    return c.json(
      { error: { code: 'NOT_FOUND', message: 'This notification does not exist' } },
      404,
    );
  }

  return c.json(result);
});
