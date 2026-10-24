import { api } from '$lib/api/client';

import { isPreviewable } from './attachment-rules';

/**
 * Opens a confirmed attachment through a short-lived URL (UI spec §8.5). A PDF
 * or image opens in a tab; anything else is saved under its own name. The API
 * decides who may read the file, so this only chooses how the browser shows it.
 */
export async function openAttachment(
  reportId: string,
  attachmentId: string,
  fileName: string,
): Promise<void> {
  const { url } = await api.attachments.url(reportId, attachmentId);

  if (isPreviewable(fileName)) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  link.click();
}
