import { createDb, createReportReadQueries, createReportSearchQueries } from '@par/db';
import { repositoryQuerySchema } from '@par/shared';
import { Hono, type Context } from 'hono';

import type { AppEnv } from '../../env';
import { requireSession } from '../../middleware/auth';
import { requireRole } from '../../middleware/authorize';

/** Repository search (spec §7.11): retrieval, role-gated, never drafts. */
export const searchRoutes = new Hono<AppEnv>();

searchRoutes.use('*', requireSession);

const reader = requireRole('REVIEWER', 'APPROVER', 'ADMIN');

async function search(c: Context<AppEnv>) {
  const raw = c.req.query();
  const repeated = c.req.queries('sdg');
  const sdg =
    repeated && repeated.length > 0
      ? repeated
      : raw.sdg
        ? raw.sdg
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean)
        : undefined;

  const parsed = repositoryQuerySchema.safeParse({ ...raw, ...(sdg ? { sdg } : {}) });
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'INVALID_QUERY',
          message: 'That repository filter is not supported',
          details: parsed.error.issues,
        },
      },
      400,
    );
  }

  const db = createDb(c.env.DB);
  const reads = createReportReadQueries(db);
  const term = parsed.data.term ? await reads.findTerm(parsed.data.term) : null;
  const activityFrom = parsed.data.activityFrom ?? term?.startsOn;
  const activityTo = parsed.data.activityTo ?? term?.endsOn;
  const page = await createReportSearchQueries(db).search({
    ...parsed.data,
    ...(activityFrom ? { activityFrom } : {}),
    ...(activityTo ? { activityTo } : {}),
  });

  return c.json({
    items: page.rows.map(({ narrative, ...item }) => {
      const snippet = excerpt(narrative, parsed.data.q);
      return { ...item, ...(snippet ? { snippet } : {}) };
    }),
    total: page.total,
    page: parsed.data.page,
    size: parsed.data.size,
    facets: page.facets,
  });
}

/** A short narrative excerpt around the free-text match, never the whole text. */
function excerpt(narrative: string, query: string | undefined): string | null {
  const needle = query?.trim().toLowerCase();
  if (!needle) return null;

  const index = narrative.toLowerCase().indexOf(needle);
  if (index === -1) return null;

  const start = Math.max(0, index - 60);
  const end = Math.min(narrative.length, index + needle.length + 100);
  const prefix = start > 0 ? '\u2026' : '';
  const suffix = end < narrative.length ? '\u2026' : '';

  return `${prefix}${narrative.slice(start, end).trim()}${suffix}`;
}

searchRoutes.get('/', reader, (c) => search(c));
searchRoutes.get('/reports', reader, (c) => search(c));
