import type { ReportSearchRow } from '@par/db';
import type { ReportSearchItem, ReportSearchMatch } from '@par/shared';

import { toReportListItem } from './report-shape';

/** Characters of narrative kept on each side of the hit. */
const SNIPPET_RADIUS = 160;

/**
 * The narrative around the match, so the palette can show why a report was
 * found without opening it. The text body is normalized to one line: a preview
 * row must never grow to the height of the paragraph it quotes.
 */
export function snippetAround(
  text: string,
  term: string,
  radius = SNIPPET_RADIUS,
): string | undefined {
  const needle = term.trim().toLowerCase();
  if (!needle) return undefined;

  const at = text.toLowerCase().indexOf(needle);
  if (at === -1) return undefined;

  const start = Math.max(0, at - radius);
  const end = Math.min(text.length, at + needle.length + radius);
  const body = text.slice(start, end).replace(/\s+/g, ' ').trim();
  if (!body) return undefined;

  return `${start > 0 ? '…' : ''}${body}${end < text.length ? '…' : ''}`;
}

function contains(value: string | null | undefined, needle: string): boolean {
  return (value ?? '').toLowerCase().includes(needle);
}

/**
 * Which field caused the row to be returned, in the order a reader would
 * recognize it: the number, then the title, then the prose around it. `undefined`
 * means the row was not matched at all (the recent group).
 */
export function matchOf(row: ReportSearchRow, term: string): ReportSearchMatch | undefined {
  const needle = term.trim().toLowerCase();
  if (!needle) return undefined;

  if (contains(row.report.trackingNumber, needle)) return 'tracking';
  if (contains(row.report.title, needle)) return 'title';
  if (contains(row.report.narrative, needle)) return 'narrative';
  if (contains(row.report.location, needle)) return 'location';
  if (contains(row.ownerName, needle)) return 'submitter';
  if (contains(row.picName, needle)) return 'pic';

  return undefined;
}

/** The stored row as the palette contract, preview context included. */
export function toReportSearchItem(row: ReportSearchRow, term: string): ReportSearchItem {
  const matched = matchOf(row, term);
  const snippet = matched === 'narrative' ? snippetAround(row.report.narrative, term) : undefined;

  return {
    ...toReportListItem(row.report),
    classification: row.report.classification,
    ownerName: row.ownerName,
    unitName: row.unitName,
    ...(matched ? { matched } : {}),
    ...(snippet ? { snippet } : {}),
  };
}
