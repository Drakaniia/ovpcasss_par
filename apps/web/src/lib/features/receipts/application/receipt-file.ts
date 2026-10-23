import type { ReportReceipt } from '@par/shared';

import { apiDownload, saveBlob } from '$lib/api/http';

/** The name the office files the form under: the recipient, not the record. */
export function receiptFilename(recipientName: string): string {
  return `OVPCASSS-F-013-${recipientName.replaceAll(/[^0-9A-Za-z]+/g, '-')}.pdf`;
}

/**
 * Fetches the issued PDF and saves it. The API re-renders the form on every
 * request, so a download always prints the current layout.
 */
export async function downloadReceipt(reportId: string, receipt: ReportReceipt): Promise<void> {
  const blob = await apiDownload(`/reports/${reportId}/receipts/${receipt.id}/file`);
  saveBlob(blob, receiptFilename(receipt.recipientName));
}
