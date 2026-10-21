import type { ReportRow, UserRow } from '@par/db';
import { receiptTemplate, type EmailAttachmentRef } from '@par/email';

import { applyAttachmentBudget, maxAttachmentBytes } from '../../../email/attachments';
import { enqueueEmail, suppressEmail } from '../../../email/outbox';
import type { Env } from '../../../env';
import { renderReportFacsimile, FACSIMILE_TYPE } from './render-facsimile';

/**
 * The submission receipt (email spec §5.1, D11): the submitter's proof of filing,
 * carrying the report exactly as filed with the `NOT_APPROVED` watermark.
 *
 * It is sent once, on first submission. The submitter is the actor, so the mail
 * is not routed through `notify()` (which exists to tell someone else about an
 * event) — but their workflow mute still applies, and a mute is recorded as a
 * suppression rather than silently dropped.
 */
export async function sendSubmissionReceipt(
  env: Env,
  report: ReportRow,
  submitter: UserRow | null,
  origin?: string,
): Promise<void> {
  if (!submitter || !report.trackingNumber) return;

  if (!submitter.emailWorkflow) {
    await suppressEmail(env, {
      kind: 'RECEIPT',
      to: submitter.email,
      reason: 'recipient muted workflow mail',
      reportId: report.id,
      subject: `Submission received: ${report.trackingNumber}`,
    });
    return;
  }

  const ref = await storedFacsimile(env, report);

  await enqueueEmail(env, {
    kind: 'RECEIPT',
    to: submitter.email,
    reportId: report.id,
    ...(ref.refs.length === 0 && ref.omitted ? { note: 'attachment omitted (size)' } : {}),
    content: receiptTemplate({
      trackingNumber: report.trackingNumber,
      title: report.title,
      receivedAt: report.submittedAt ?? report.updatedAt,
      hasAttachment: ref.refs.length > 0,
      attachmentOmitted: ref.omitted,
      ...(origin === undefined ? {} : { origin }),
    }),
    attachments: ref.refs,
  });
}

/** Render, store, and describe the PDF; a failure sends the receipt without it. */
async function storedFacsimile(
  env: Env,
  report: ReportRow,
): Promise<{ refs: readonly EmailAttachmentRef[]; omitted: boolean }> {
  try {
    const { bytes } = await renderReportFacsimile(env, report.id);
    const objectKey = `facsimile/${report.id}.pdf`;
    await env.BUCKET.put(objectKey, bytes, { httpMetadata: { contentType: FACSIMILE_TYPE } });

    const ref = {
      objectKey,
      filename: `OVPCASSS-PAR-${report.trackingNumber}.pdf`,
      contentType: FACSIMILE_TYPE,
      size: bytes.length,
    };

    return applyAttachmentBudget([ref], maxAttachmentBytes(env));
  } catch (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'Receipt attachment could not be rendered',
        reportId: report.id,
        reason: error instanceof Error ? error.message : 'unknown',
      }),
    );
    return { refs: [], omitted: false };
  }
}
