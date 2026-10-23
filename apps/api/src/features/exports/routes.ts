import {
  createDb,
  createMonitoringQueries,
  createRateLimitQueries,
  createUserQueries,
} from '@par/db';
import { buildMonitoringTemplate, buildMonitoringWorkbook } from '@par/export';
import {
  monitoringExportRequestSchema,
  sendWorkbookSchema,
  type MonitoringExportRequest,
} from '@par/shared';
import { Hono, type Context } from 'hono';

import type { AppEnv } from '../../env';
import { recordAudit } from '../../lib/audit';
import { requireSession } from '../../middleware/auth';
import { requireRole } from '../../middleware/authorize';
import { assembleMonitoring } from './application/assemble-monitoring';
import { sendMonitoringWorkbook } from './application/send-workbook';

const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** The preview shows the first 50 rows; the download has all of them. */
const PREVIEW_ROW_CAP = 50;

/**
 * Monitoring sheet exports (spec §7.13). The download is the office's whole
 * workbook, in source order, with the selected sheet carrying the rows and the
 * other two left blank (phase 14 §4, revised). Reviewers, approvers, and admins
 * may export; the preview uses the same assembly as the file.
 */
export const exportRoutes = new Hono<AppEnv>();

exportRoutes.use('*', requireSession);

const canExport = requireRole('ADMIN');

function queries(c: Context<AppEnv>) {
  return createMonitoringQueries(createDb(c.env.DB));
}

function filename(request: MonitoringExportRequest): string {
  const type = request.type.replaceAll('_', '-');
  return `OVPCASSS-Monitoring-${type}-SY${request.schoolYear}-S${request.semester}.xlsx`;
}

function invalid(c: Context<AppEnv>) {
  return c.json(
    {
      error: {
        code: 'VALIDATION_ERROR',
        message:
          'Choose a sheet type, a school year, a semester, and whether to include in-progress reports.',
      },
    },
    400,
  );
}

function workbookResponse(bytes: Uint8Array, request: MonitoringExportRequest): Response {
  return new Response(bytes as BodyInit, {
    status: 200,
    headers: {
      'content-type': XLSX_TYPE,
      'content-disposition': `attachment; filename="${filename(request)}"`,
      'cache-control': 'no-store',
    },
  });
}

/** Five mailed workbooks an hour per user (email spec §11.3). */
const WORKBOOK_SEND_LIMIT = 5;

exportRoutes.post('/monitoring/send', canExport, async (c) => {
  const parsed = sendWorkbookSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Check the recipients and the note before sending.',
          details: parsed.error.issues,
        },
      },
      400,
    );
  }

  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Sign in to send a workbook' } }, 401);
  }

  const windowStart = `${new Date().toISOString().slice(0, 13)}:00:00.000Z`;
  const used = await createRateLimitQueries(createDb(c.env.DB)).consume(
    `workbook-send:${userId}`,
    windowStart,
  );
  if (used > WORKBOOK_SEND_LIMIT) {
    return c.json(
      {
        error: {
          code: 'RATE_LIMITED',
          message: 'Five mailed workbooks an hour is the limit. Try again later.',
        },
      },
      429,
    );
  }

  const sender = await createUserQueries(createDb(c.env.DB)).findById(userId);
  if (!sender) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Sign in to send a workbook' } }, 401);
  }

  const result = await sendMonitoringWorkbook(
    c.env,
    parsed.data,
    sender,
    new URL(c.req.url).origin,
  );

  if (!result.ok) {
    return result.code === 'TERM_NOT_CONFIGURED'
      ? c.json({ error: { code: result.code, message: result.message } }, 400)
      : c.json({ error: { code: result.code, message: result.message } }, 400);
  }

  await recordAudit(c, {
    actorUserId: userId,
    actorRole: c.get('role'),
    action: 'EXPORTED',
    entityType: 'export',
    comment: `Monitoring workbook (${parsed.data.type}), SY ${parsed.data.schoolYear}, semester ${parsed.data.semester}, mailed to ${result.queued} recipient(s)`,
  });

  return c.json({ queued: result.queued }, 202);
});

exportRoutes.get('/monitoring/preview', canExport, async (c) => {
  const semester = c.req.query('semester');

  const parsed = monitoringExportRequestSchema.safeParse({
    type: c.req.query('type'),
    schoolYear: c.req.query('schoolYear'),
    semester: semester === undefined ? undefined : Number(semester),
    includeInProgress: c.req.query('includeInProgress') === 'true',
  });
  if (!parsed.success) return invalid(c);

  const assembled = await assembleMonitoring(queries(c), parsed.data);
  if (!assembled.ok) {
    return c.json({ error: { code: 'TERM_NOT_CONFIGURED', message: assembled.message } }, 400);
  }

  return c.json({
    schoolYear: parsed.data.schoolYear,
    semester: parsed.data.semester,
    generatedAt: new Date().toISOString(),
    sheet: {
      ...assembled.sheet.sheet,
      rows: assembled.sheet.sheet.rows.slice(0, PREVIEW_ROW_CAP),
    },
  });
});

exportRoutes.get('/monitoring/template', canExport, () => {
  return new Response(buildMonitoringTemplate() as BodyInit, {
    status: 200,
    headers: {
      'content-type': XLSX_TYPE,
      'content-disposition': 'attachment; filename="OVPCASSS-Monitoring-Template.xlsx"',
      'cache-control': 'no-store',
    },
  });
});

exportRoutes.post('/monitoring', canExport, async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = monitoringExportRequestSchema.safeParse(body);
  if (!parsed.success) return invalid(c);

  const assembled = await assembleMonitoring(queries(c), parsed.data);
  if (!assembled.ok) {
    return c.json({ error: { code: 'TERM_NOT_CONFIGURED', message: assembled.message } }, 400);
  }

  const total = assembled.sheet.sheet.total;

  await recordAudit(c, {
    actorUserId: c.get('userId'),
    actorRole: c.get('role'),
    action: 'EXPORTED',
    entityType: 'export',
    comment: `Monitoring workbook (${parsed.data.type}), ${total} reports, SY ${parsed.data.schoolYear}, semester ${parsed.data.semester}${parsed.data.includeInProgress ? ' (including in progress)' : ''}`,
  });

  return workbookResponse(
    buildMonitoringWorkbook({
      type: parsed.data.type,
      schoolYear: parsed.data.schoolYear,
      semester: parsed.data.semester,
      rows: assembled.sheet.rows,
    }),
    parsed.data,
  );
});
