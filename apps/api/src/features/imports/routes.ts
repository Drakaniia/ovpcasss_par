import { createDb, createMonitoringQueries, createReferenceQueries } from '@par/db';
import { parseMonitoringWorkbook } from '@par/export';
import { Hono, type Context } from 'hono';

import type { AppEnv } from '../../env';
import { recordAudit } from '../../lib/audit';
import { requireSession } from '../../middleware/auth';
import { requireRole } from '../../middleware/authorize';
import { importMonitoring } from './application/import-monitoring';

/** A workbook is a migration tool, not a bulk API; both caps are generous. */
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_IMPORT_ROWS = 300;

/**
 * Importing an existing monitoring workbook (admin only). The same file the
 * export produces is accepted back: OFF-CAMPUS, EDUCATIONAL TOUR, and IN-CAMPUS
 * sheets are read, matched by tracking number, and upserted.
 */
export const importRoutes = new Hono<AppEnv>();

importRoutes.use('*', requireSession);
importRoutes.use('*', requireRole('ADMIN'));

function badRequest(c: Context<AppEnv>, message: string, status: 400 | 413 = 400) {
  return c.json({ error: { code: 'INVALID_WORKBOOK', message } }, status);
}

importRoutes.post('/monitoring', async (c) => {
  const form = await c.req.formData().catch(() => null);
  const file = form?.get('file');

  if (!(file instanceof File)) {
    return badRequest(c, 'Choose an .xlsx workbook to import.');
  }

  if (file.size === 0) return badRequest(c, 'That workbook is empty.');
  if (file.size > MAX_UPLOAD_BYTES) {
    return badRequest(c, 'Workbooks are limited to 10 MB.', 413);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
    return badRequest(c, 'That file is not an .xlsx workbook.');
  }

  let sheets;
  try {
    sheets = parseMonitoringWorkbook(bytes);
  } catch (error) {
    return badRequest(
      c,
      error instanceof Error ? error.message : 'That workbook could not be read.',
    );
  }

  const rowCount = sheets.reduce((total, sheet) => total + sheet.rows.length, 0);
  if (rowCount > MAX_IMPORT_ROWS) {
    return badRequest(
      c,
      `Import at most ${MAX_IMPORT_ROWS} rows at a time. This workbook has ${rowCount}.`,
      413,
    );
  }

  const db = createDb(c.env.DB);
  const reference = createReferenceQueries(db);
  const [campuses, units, sdgs] = await Promise.all([
    reference.list('campuses'),
    reference.list('units'),
    reference.list('sdgs'),
  ]);

  const result = await importMonitoring(createMonitoringQueries(db), {
    sheets,
    actorUserId: c.get('userId')!,
    references: {
      campuses: campuses.map((row) => ({ id: row.id, name: row.name, code: row.code })),
      units: units.map((row) => ({ id: row.id, name: row.name, code: row.code })),
      sdgs: sdgs.map((row) => ({ id: row.id, number: row.number })),
    },
  });

  await recordAudit(c, {
    actorUserId: c.get('userId'),
    actorRole: c.get('role'),
    action: 'IMPORTED',
    entityType: 'report',
    comment: `Monitoring workbook: ${result.created} created, ${result.updated} updated, ${result.failed} failed, ${result.skipped} blank`,
  });

  return c.json(result);
});
