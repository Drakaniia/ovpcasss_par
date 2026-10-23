import {
  createDb,
  createReferenceQueries,
  createReportReadQueries,
  createUserQueries,
  type ReportWithNames,
} from '@par/db';
import { imageMediaType, renderFacsimilePdf, type FacsimilePdfData } from '@par/export';
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
  PENDING: 'Pending',
  SUBMITTED: 'Submitted',
  RETURNED: 'Returned',
  APPROVED: 'Approved',
};

export const FACSIMILE_TYPE = 'application/pdf';

/** An unsubmitted record is marked; everything short of approval is not valid yet. */
export function watermarkFor(status: ReportStatus): FacsimilePdfData['watermark'] {
  if (status === 'APPROVED') return 'NONE';
  return status === 'PENDING' ? 'NOT_SUBMITTED' : 'NOT_APPROVED';
}

/**
 * Reads a stored image straight from R2; a missing object prints the rule and
 * is logged with the report id (bug phase 05 §3.7).
 */
async function readImage(
  env: Env,
  key: string | null,
  reportId: string,
): Promise<Uint8Array | null> {
  if (!key) return null;

  let bytes: Uint8Array;
  try {
    const object = await env.BUCKET.get(key);
    if (!object) {
      logBrokenSignature(reportId, 'The signature object is missing');
      return null;
    }
    bytes = new Uint8Array(await object.arrayBuffer());
  } catch (error) {
    logBrokenSignature(reportId, 'The signature object could not be read', error);
    return null;
  }

  if (!imageMediaType(bytes)) {
    logBrokenSignature(reportId, 'The signature object is not a PNG or JPEG');
    return null;
  }

  return bytes;
}

function logBrokenSignature(reportId: string, message: string, error?: unknown): void {
  console.error(
    JSON.stringify({
      level: 'error',
      message,
      reportId,
      ...(error ? { reason: error instanceof Error ? error.message : 'unknown' } : {}),
    }),
  );
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
    row.submittedByUserId ? users.findById(row.submittedByUserId) : Promise.resolve(null),
    createReferenceQueries(db).list('sdgs'),
    row.approvedByUserId ? users.findById(row.approvedByUserId) : Promise.resolve(null),
  ]);

  const [submitterSignature, approverSignature] = await Promise.all([
    readImage(env, row.narrativeSignatureKey, row.id),
    readImage(env, row.approvalSignatureKey ?? approver?.signatureObjectKey ?? null, row.id),
  ]);

  const bytes = await renderFacsimilePdf({
    referenceNo: row.referenceNo,
    title: row.title,
    statusLabel: STATUS_LABELS[row.status],
    personnelName: submitter?.fullName ?? pics[0]?.name ?? 'Personnel in charge',
    classification: CLASSIFICATION_LABELS[row.classification],
    campus: row.campusName ?? '',
    college: row.unitName ?? '',
    department: row.department,
    office: row.office,
    level: LEVEL_LABELS[row.level],
    activityStartDate: row.activityStartDate,
    activityEndDate: row.activityEndDate,
    location: row.location,
    activityCount: row.activityCount,
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
    archivedAt: row.archivedAt,
    approvedByName: approver?.fullName ?? null,
    approvedAt: row.approvedAt,
    ...(submitterSignature ? { submitterSignature } : {}),
    ...(approverSignature ? { approverSignature } : {}),
  });

  return { row, bytes };
}
