import {
  createDb,
  createReceiptQueries,
  type ReportPicRow,
  type ReportRow,
} from '@par/db';
import { renderReceipt } from '@par/export';

import { enqueueEmail } from '../../../email/outbox';
import { receiptIssuedTemplate } from '@par/email';
import type { Env } from '../../../env';
import { createId } from '../../../lib/ids';
import { receiptSignatoryFor } from '../../settings/application/receipt-signatory';

/**
 * The receipt bytes for one person in charge. Shared by issuance and by a
 * download that finds the stored copy missing, so both print the same form.
 */
export async function renderReceiptBytes(
  env: Env,
  report: ReportRow,
  pic: ReportPicRow,
): Promise<Uint8Array> {
  if (!report.approvedAt) throw new Error('An unapproved record has no receipt');

  const signatory = await receiptSignatoryFor(env);

  return renderReceipt({
    referenceNo: report.referenceNo,
    recipientName: pic.name,
    title: report.title,
    type: report.type,
    activityStartDate: report.activityStartDate,
    activityEndDate: report.activityEndDate,
    location: report.location,
    approvedAt: report.approvedAt,
    signatoryName: signatory.name,
    signatoryTitle: signatory.title,
  });
}

/**
 * Approval issues one acknowledgment receipt per PIC (spec §10). A render or
 * mail failure never rolls back the approval: the record stays approved, the
 * failure is visible in the mail log, and a later download repairs the file.
 */
export async function issueReceipts(
  env: Env,
  report: ReportRow,
  pics: readonly ReportPicRow[],
  origin: string,
): Promise<void> {
  if (report.status !== 'APPROVED' || !report.approvedAt) return;

  const db = createDb(env.DB);
  const receipts = createReceiptQueries(db);
  const now = new Date().toISOString();

  for (const pic of pics) {
    try {
      const bytes = await renderReceiptBytes(env, report, pic);

      const objectKey = `receipts/${report.id}/${pic.id}.pdf`;
      await env.BUCKET.put(objectKey, bytes, {
        httpMetadata: { contentType: 'application/pdf' },
      });

      const row = await receipts.save({
        id: createId(),
        reportId: report.id,
        recipientPicId: pic.id,
        recipientUserId: pic.userId,
        recipientName: pic.name,
        objectKey,
        now,
      });

      // The receipt belongs to the person in charge, so it goes to the address
      // on their PIC row — not gated on an account they may never have opened.
      await enqueueEmail(env, {
        kind: 'RECEIPT_ISSUED',
        to: pic.email,
        reportId: report.id,
        content: receiptIssuedTemplate({
          referenceNo: report.referenceNo,
          title: report.title,
          picName: pic.name,
          approvedAt: report.approvedAt,
          origin,
          hasAttachment: true,
        }),
        attachments: [
          {
            objectKey,
            filename: `OVPCASSS-F-013-${report.referenceNo.replaceAll(/[^0-9A-Za-z]+/g, '-')}.pdf`,
            contentType: 'application/pdf',
            size: bytes.length,
          },
        ],
      });
      await receipts.markEmailed(row.id, now);
    } catch (error) {
      console.error(
        JSON.stringify({
          level: 'error',
          message: 'Receipt could not be issued',
          reportId: report.id,
          picId: pic.id,
          reason: error instanceof Error ? error.message : 'unknown',
        }),
      );
    }
  }
}
