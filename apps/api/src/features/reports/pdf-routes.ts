import type { Hono, Context } from 'hono';

import type { AppEnv } from '../../env';
import { recordAudit } from '../../lib/audit';
import { signedDownloadUrl } from '../../lib/download-url';
import { canViewReport, isAdmin } from './domain/report-access';
import { reportDependencies, viewerOf } from './application/report-context';
import {
  FACSIMILE_TYPE,
  renderReportFacsimile,
  watermarkFor,
} from './application/render-facsimile';

async function findVisibleReport(c: Context<AppEnv>, reportId: string) {
  const viewer = viewerOf(c);
  if (!viewer) return null;

  const deps = reportDependencies(c);
  const row = await deps.read.findById(reportId);
  if (!row) return null;
  // The facsimile is the office's copy of the record (spec §18 A12); the PIC's
  // document is the acknowledgment receipt, not this internal PDF.
  if (!isAdmin(viewer)) return null;
  const isPic = await deps.read.isPic(row.id, viewer.userId);
  return canViewReport(viewer, isPic) ? row : null;
}

/**
 * The facsimile PDF (spec §7.8). The JSON endpoint stores a freshly rendered PDF
 * and returns a short-lived presigned URL, which also works from the desktop
 * shell; without storage credentials it falls back to the authenticated file
 * endpoint so local development still downloads.
 */
export function registerReportPdfRoutes(router: Hono<AppEnv>): void {
  router.get('/:id/pdf', async (c) => {
    if (!viewerOf(c)) {
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'Sign in to continue' } }, 401);
    }

    const row = await findVisibleReport(c, c.req.param('id') ?? '');
    if (!row) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'This report does not exist' } }, 404);
    }

    const { bytes } = await renderReportFacsimile(c.env, row.id);
    const objectKey = `facsimile/${row.id}.pdf`;
    await c.env.BUCKET.put(objectKey, bytes, { httpMetadata: { contentType: FACSIMILE_TYPE } });

    const url = await signedDownloadUrl(c, objectKey, `/api/v1/reports/${row.id}/pdf/file`);

    return c.json({
      url,
      expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
      watermark: watermarkFor(row.status),
    });
  });

  router.get('/:id/pdf/file', async (c) => {
    const viewer = viewerOf(c);
    if (!viewer) {
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'Sign in to continue' } }, 401);
    }

    const row = await findVisibleReport(c, c.req.param('id') ?? '');
    if (!row) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'This report does not exist' } }, 404);
    }

    const { bytes } = await renderReportFacsimile(c.env, row.id);

    await recordAudit(c, {
      actorUserId: viewer.userId,
      actorRole: viewer.role,
      action: 'EXPORTED',
      entityType: 'report',
      entityId: row.id,
      comment: 'Facsimile downloaded',
    });

    return new Response(bytes as BodyInit, {
      status: 200,
      headers: {
        'content-type': FACSIMILE_TYPE,
        'content-disposition': `inline; filename="${row.referenceNo.replaceAll(' ', '-')}.pdf"`,
        'cache-control': 'no-store',
      },
    });
  });
}
