import type { ReportRow } from '@par/db';
import type { EmailAttachmentRef } from '@par/email';

import type { Env } from '../../../env';
import { ensureStoredAcknowledgement } from '../../acknowledgement/application/render-acknowledgement';

const PDF_TYPE = 'application/pdf';

/**
 * The acknowledgement for an approved report, as a queue reference (email spec
 * §7.4). Approval is never rolled back because mail or a PDF failed (§7.3): a
 * render failure logs the report id and the message goes without the document.
 */
export async function approvalAttachment(
  env: Env,
  report: ReportRow,
): Promise<EmailAttachmentRef | null> {
  try {
    const objectKey = await ensureStoredAcknowledgement(env, report);
    const head = await env.BUCKET.head(objectKey);

    return {
      objectKey,
      filename: `OVPCASSS-Acknowledgement-${report.trackingNumber ?? report.id}.pdf`,
      contentType: PDF_TYPE,
      size: head?.size ?? 0,
    };
  } catch (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'Acknowledgement could not be rendered for the approval mail',
        reportId: report.id,
        reason: error instanceof Error ? error.message : 'unknown',
      }),
    );
    return null;
  }
}
