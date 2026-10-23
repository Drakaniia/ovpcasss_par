import { createDb, createReceiptQueries } from '@par/db';
import { Hono } from 'hono';

import type { AppEnv } from '../../env';
import { requireSession } from '../../middleware/auth';
import { toMyReceipts } from './application/my-receipts';

/**
 * The signed-in account's own acknowledgment receipts (spec §10). Mounted at
 * `/receipts`, so `GET /` is that account's history and never anyone else's.
 */
export const receiptRoutes = new Hono<AppEnv>();

receiptRoutes.use('*', requireSession);

receiptRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Sign in to continue' } }, 401);
  }

  const db = createDb(c.env.DB);
  const rows = await createReceiptQueries(db).listForRecipient(userId);

  return c.json({ items: toMyReceipts(rows) });
});
