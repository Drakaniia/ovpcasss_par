import { renderFacsimilePdf, type FacsimilePdfData } from '@par/export';
import type { ReportStatus } from '@par/shared';
import type { Hono, Context } from 'hono';

import type { AppEnv } from '../../env';
import { recordAudit } from '../../lib/audit';
import { signedDownloadUrl } from '../../lib/download-url';
import { canViewReport } from './domain/report-access';
import { reportDependencies, viewerOf } from './application/workflow-context';

const CLASSIFICATION_LABELS = {
  CURRICULAR: 'Curricular',
  NON_CURRICULAR: 'Non-curricular',
} as const;

const LEVEL_LABELS = {
  GRADUATE: 'Graduate',
  UNDERGRADUATE: 'Undergraduate',
} as const;

const STATUS_LABELS: Record<ReportStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  RETURNED_BY_REVIEWER: 'Returned by reviewer',
  RESUBMITTED: 'Resubmitted',
  ENDORSED: 'Endorsed',
  RETURNED_BY_APPROVER: 'Returned by approver',
  APPROVED: 'Approved',
};

const PDF_TYPE = 'application/pdf';

function watermarkFor(status: ReportStatus): FacsimilePdfData['watermark'] {
  if (status === 'APPROVED') return 'NONE';
  return status === 'DRAFT' ? 'DRAFT' : 'NOT_APPROVED';
}

/** Renders the current facsimile from persisted data; never from the client. */
async function renderFacsimile(c: Context<AppEnv>, reportId: string): Promise<Uint8Array> {
  const stack = reportDependencies(c);
  const row = await stack.read.findWithNames(reportId);
  if (!row) throw new Error('The report does not exist');

  const [pics, sdgIds, attachments, sdgs, submitter, approver] = await Promise.all([
    stack.read.listPics(row.id),
    stack.read.listSdgIds(row.id),
    stack.read.listAttachments(row.id),
    stack.references.list('sdgs'),
    stack.users.findById(row.ownerUserId),
    row.approvedByUserId ? stack.users.findById(row.approvedByUserId) : Promise.resolve(null),
  ]);

  const numbers = new Map(sdgs.map((sdg) => [sdg.id, sdg.number]));
  return renderFacsimilePdf({
    trackingNumber: row.trackingNumber,
    title: row.title,
    statusLabel: STATUS_LABELS[row.status],
    submitterName: submitter?.fullName ?? 'OVPCASSS',
    classification: CLASSIFICATION_LABELS[row.classification],
    campus: row.campusName ?? '',
    college: row.unitName ?? '',
    department: row.department,
    office: row.office,
    level: LEVEL_LABELS[row.level],
    activityStartDate: row.activityStartDate,
    activityEndDate: row.activityEndDate,
    location: row.location,
    totalStudents: row.totalStudents,
    totalPic: row.totalPic,
    pics: pics.map((pic) => ({ name: pic.name, email: pic.email, phone: pic.phone })),
    sdgNumbers: sdgIds
      .map((id) => numbers.get(id))
      .filter((number): number is number => number !== undefined)
      .sort((left, right) => left - right),
    narrative: row.narrative,
    attachments: attachments
      .filter((attachment) => attachment.status === 'CONFIRMED')
      .map((attachment) => ({
        label: attachment.label,
        originalName: attachment.originalName,
      })),
    watermark: watermarkFor(row.status),
    generatedAt: new Date().toISOString(),
    approvedByName: approver?.fullName ?? null,
    approvedAt: row.approvedAt,
  });
}

async function findVisibleReport(c: Context<AppEnv>, reportId: string) {
  const viewer = viewerOf(c);
  if (!viewer) return null;

  const row = await reportDependencies(c).read.findById(reportId);
  if (!row || !canViewReport(viewer, row.ownerUserId)) return null;
  return row;
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

    const bytes = await renderFacsimile(c, row.id);
    const objectKey = `facsimile/${row.id}.pdf`;
    await c.env.BUCKET.put(objectKey, bytes, { httpMetadata: { contentType: PDF_TYPE } });

    const url = await signedDownloadUrl(
      c,
      objectKey,
      `/api/v1/reports/${row.id}/pdf/file`,
    );

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

    const bytes = await renderFacsimile(c, row.id);

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
        'content-type': PDF_TYPE,
        'content-disposition': `inline; filename="${row.trackingNumber ?? 'PAR-draft'}.pdf"`,
        'cache-control': 'no-store',
      },
    });
  });
}
