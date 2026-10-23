import type { ReceiptWithReport } from '@par/db';
import type { MyReceipt } from '@par/shared';

/**
 * The recipient's own receipt history (spec §10). Only the form that was issued
 * is listed; the PDF itself stays behind the report's receipt file route, which
 * re-renders it and authorises the named recipient.
 */
export function toMyReceipts(rows: readonly ReceiptWithReport[]): MyReceipt[] {
  return rows.map((row) => ({
    id: row.id,
    reportId: row.reportId,
    referenceNo: row.referenceNo,
    title: row.title,
    recipientName: row.recipientName,
    generatedAt: row.generatedAt,
    ...(row.emailedAt ? { emailedAt: row.emailedAt } : {}),
  }));
}
