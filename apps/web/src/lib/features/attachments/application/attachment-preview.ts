import type { Attachment } from '@par/shared';

import { extensionOf, fileKind } from './attachment-rules';

/**
 * Preview classification for a submitted attachment (report 12). The office
 * reviews what the personnel in charge filed, so the page distinguishes files
 * it can show inline from files it can only open or download.
 *
 * The extension drives the kind because the stored MIME type may be generic
 * (`application/octet-stream`) when an office client uploaded the file.
 */

export type PreviewKind = 'image' | 'pdf' | 'office' | 'other';

export type AttachmentLike = Pick<Attachment, 'originalName' | 'mimeType'>;

/** Formats a browser can draw in an `<img>` without a plugin. */
const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif']);
const IMAGE_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

const PDF_MIME_TYPES = new Set(['application/pdf']);

export function previewKind(attachment: AttachmentLike): PreviewKind {
  const extension = extensionOf(attachment.originalName);
  const mime = attachment.mimeType.toLowerCase();

  if (IMAGE_EXTENSIONS.has(extension) || IMAGE_MIME_TYPES.has(mime)) return 'image';
  if (extension === 'pdf' || PDF_MIME_TYPES.has(mime)) return 'pdf';

  const kind = fileKind(attachment.originalName);
  if (kind === 'word' || kind === 'excel' || kind === 'powerpoint') return 'office';

  return 'other';
}

/** A short noun for the dialog and the row metadata. */
export function attachmentTypeLabel(attachment: AttachmentLike): string {
  switch (previewKind(attachment)) {
    case 'image':
      return 'Image';
    case 'pdf':
      return 'PDF document';
    case 'office': {
      const kind = fileKind(attachment.originalName);
      if (kind === 'excel') return 'Excel workbook';
      if (kind === 'powerpoint') return 'PowerPoint presentation';
      return 'Word document';
    }
    default:
      return fileKind(attachment.originalName) === 'archive' ? 'Archive' : 'File';
  }
}

/** The one authenticated byte endpoint; no object key ever reaches the page. */
export function attachmentFilePath(reportId: string, attachmentId: string): string {
  return `/reports/${reportId}/attachments/${attachmentId}/file`;
}
