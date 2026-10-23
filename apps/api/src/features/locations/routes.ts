import { createDb, createReportReadQueries } from '@par/db';
import { locationQuerySchema } from '@par/shared';
import { Hono } from 'hono';

import type { AppEnv } from '../../env';
import { requireSession } from '../../middleware/auth';
import { requireRole } from '../../middleware/authorize';

/**
 * Reusable locations (bug phase 04 §3.1): up to eight values the office already
 * entered, newest first. Read-only, scoped to the caller's readable reports, and
 * never a list an administrator has to maintain.
 */
export const locationRoutes = new Hono<AppEnv>();

locationRoutes.use('*', requireSession);

locationRoutes.get('/', requireRole('ADMIN', 'PERSONNEL'), async (c) => {
  const parsed = locationQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'INVALID_QUERY',
          message: 'That location search is not supported',
          details: parsed.error.issues,
        },
      },
      400,
    );
  }

  const db = createDb(c.env.DB);
  const rows = await createReportReadQueries(db).locations(
    { userId: c.get('userId') ?? '', isAdmin: c.get('role') === 'ADMIN' },
    parsed.data.q ?? '',
    parsed.data.limit,
  );

  return c.json({
    items: rows.map((row) => ({ ...row, source: 'office' as const })),
  });
});
