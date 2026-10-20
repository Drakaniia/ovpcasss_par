import { adminAuditListQuerySchema } from '@par/shared';
import { Hono } from 'hono';

import type { AppEnv } from '../../env';
import { requireSession } from '../../middleware/auth';
import { requireRole } from '../../middleware/authorize';
import { getAuditEvent } from './application/get-audit';
import { listAuditEvents } from './application/list-audit';

/** Admin audit log and per-report timeline (spec §7.12). Implemented in M5. */
export const auditRoutes = new Hono<AppEnv>();

auditRoutes.use('*', requireSession);
auditRoutes.use('*', requireRole('ADMIN'));

auditRoutes.get('/', async (c) => {
  const query = adminAuditListQuerySchema.parse(c.req.query());
  const result = await listAuditEvents(c, query);
  return c.json(result);
});

auditRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const event = await getAuditEvent(c, id);
  if (!event) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Audit event not found' } }, 404);
  }
  return c.json(event);
});
