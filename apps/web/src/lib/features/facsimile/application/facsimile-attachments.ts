import type { ReportDetail } from '@par/shared';

import {
  formatFileSize,
  isPreviewable,
} from '$lib/features/attachments/application/attachment-rules';

/**
 * Attachment rows in the facsimile rail (UI spec §7.7, §8.5): PDFs and images
 * open through a short-lived signed URL, office files download. The row never
 * shows the object key or an unsigned URL.
 */

export type AttachmentRow = {
  id: string;
  label: string;
  fileName: string;
  size: string;
  /** Opens in a new tab; otherwise the signed URL downloads. */
  preview: boolean;
};

export function attachmentRows(detail: ReportDetail): AttachmentRow[] {
  return detail.attachments
    .filter((attachment) => attachment.status !== 'DELETED')
    .map((attachment) => ({
      id: attachment.id,
      label: attachment.label.trim(),
      fileName: attachment.originalName,
      size: formatFileSize(attachment.size),
      preview: isPreviewable(attachment.originalName),
    }));
}
