import { formatDate, formatTime } from '$lib/format/datetime';

/**
 * Print preview helpers (UI spec §7.8). The footer names the generation time,
 * the tracking number, and the page count. Browsers cannot emit live page
 * numbers, so the count is measured from the rendered sheet at A4 scale.
 */

/** A4 is 297 mm tall; at 96 dpi that is 1122.5 CSS pixels. */
export const A4_HEIGHT_PX = (297 / 25.4) * 96;

export function generatedStamp(now: Date): string {
  const iso = now.toISOString();
  return `${formatDate(iso)} ${formatTime(iso)}`;
}

export function estimatePageCount(sheetHeight: number, pageHeight = A4_HEIGHT_PX): number {
  if (!Number.isFinite(sheetHeight) || sheetHeight <= 0) return 1;
  return Math.max(1, Math.ceil(sheetHeight / pageHeight));
}

export type PrintFooterInput = {
  now: Date;
  trackingNumber: string | null;
  pageCount: number;
};

export function printFooter(input: PrintFooterInput): string {
  const parts = [
    `Generated ${generatedStamp(input.now)}`,
    input.trackingNumber ?? 'No tracking number',
    `Page 1 of ${input.pageCount}`,
  ];
  return parts.join(' · ');
}
