import {
  createDb,
  createReferenceQueries,
  createReportReadQueries,
  createUserQueries,
  type ReportWithNames,
} from '@par/db';
import { renderFacsimilePdf, type FacsimilePdfData } from '@par/export';
import type { ReportStatus } from '@par/shared';

import type { Env } from '../../../env';

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

export const FACSIMILE_TYPE = 'application/pdf';

/** A draft is marked as such; everything short of approval is not yet valid. */
export function watermarkFor(status: ReportStatus): FacsimilePdfData['watermark'] {
  if (status === 'APPROVED') return 'NONE';
  return status === 'DRAFT' ? 'DRAFT' : 'NOT_APPROVED';
}

export interface RenderedFacsimile {
  row: ReportWithNames;
  bytes: Uint8Array;
}

/**
 * Renders the current facsimile from persisted data; never from the client
 * (spec §7.8). Extracted from the PDF route so the submission receipt can attach
 * the same document without a Hono context (email spec §15).
 */
export async function renderReportFacsimile(
  env: Env,
  reportId: string,
): Promise<RenderedFacsimile> {
  const db = createDb(env.DB);
  const read = createReportReadQueries(db);
  const users = createUserQueries(db);

  const row = await read.findWithNames(reportId);
  if (!row) throw new Error('The report does not exist');

  const [pics, sdgIds, attachments, submitter, sdgs, approver] = await Promise.all([
    read.listPics(row.id),
    read.listSdgIds(row.id),
    read.listAttachments(row.id),
    users.findById(row.ownerUserId),
    createReferenceQueries(db).list('sdgs'),
    row.approvedByUserId ? users.findById(row.approvedByUserId) : Promise.resolve(null),
  ]);

  const bytes = await renderFacsimilePdf({
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
      .map((id) => sdgs.find((sdg) => sdg.id === id)?.number)
      .filter((number): number is number => number !== undefined)
      .sort((left, right) => left - right),
    narrative: row.narrative,
    attachments: attachments
      .filter((attachment) => attachment.status === 'CONFIRMED')
      .map((attachment) => ({ label: attachment.label, originalName: attachment.originalName })),
    watermark: watermarkFor(row.status),
    generatedAt: new Date().toISOString(),
    approvedByName: approver?.fullName ?? null,
    approvedAt: row.approvedAt,
  });

  return { row, bytes };
}
