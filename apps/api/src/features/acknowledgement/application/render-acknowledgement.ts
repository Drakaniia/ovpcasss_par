import { createAcknowledgementQueries, createDb, createUserQueries, type ReportRow } from '@par/db';
import { renderAcknowledgement } from '@par/export';

import type { Env } from '../../../env';
import { createId } from '../../../lib/ids';

/**
 * Renders and stores the approval acknowledgement (spec §7.10). A failure here
 * never rolls back an approval: the report is approved either way, and the next
 * download attempt renders the PDF again.
 */
export async function ensureStoredAcknowledgement(env: Env, report: ReportRow): Promise<string> {
  if (report.status !== 'APPROVED' || !report.trackingNumber || !report.approvedAt) {
    throw new Error('The report is not approved');
  }

  const db = createDb(env.DB);
  const stored = await createAcknowledgementQueries(db).findByReport(report.id);
  if (stored) return stored.objectKey;

  const approver = report.approvedByUserId
    ? await createUserQueries(db).findById(report.approvedByUserId)
    : null;

  const signature = approver?.signatureObjectKey
    ? await env.BUCKET.get(approver.signatureObjectKey)
    : null;

  const bytes = await renderAcknowledgement({
    trackingNumber: report.trackingNumber,
    title: report.title,
    approverName: approver?.fullName ?? 'Approving officer',
    approvedAt: report.approvedAt,
    signatureImage: signature ? new Uint8Array(await signature.arrayBuffer()) : null,
  });

  const objectKey = `acknowledgements/${report.id}.pdf`;
  await env.BUCKET.put(objectKey, bytes, {
    httpMetadata: { contentType: 'application/pdf' },
  });

  await createAcknowledgementQueries(db).save({
    id: createId(),
    reportId: report.id,
    objectKey,
    now: new Date().toISOString(),
  });

  return objectKey;
}
