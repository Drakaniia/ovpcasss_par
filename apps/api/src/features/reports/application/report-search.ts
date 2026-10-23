import type { ReportSearchRow } from '@par/db';
import type { ReportSearchItem, ReportSearchMatch } from '@par/shared';
import { referenceSearchTerms } from '@par/shared';

/** Characters of narrative kept on each side of the hit. */
const SNIPPET_RADIUS = 160;

/**
 * The narrative around the match, so the palette can show why a report was found
 * without opening it. The body is normalized to one line: a preview row must
 * never grow to the height of the paragraph it quotes.
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

  return `${start > 0 ? '\u2026' : ''}${body}${end < text.length ? '\u2026' : ''}`;
}

function contains(value: string | null | undefined, needle: string): boolean {
  return (value ?? '').toLowerCase().includes(needle);
}

/**
 * Which field caused the row to be returned, in the order a reader would
 * recognize it: the number, then the title, then the prose around it. An
 * undefined answer means the row was not matched at all (the recent group).
 */
export function matchOf(row: ReportSearchRow, term: string): ReportSearchMatch | undefined {
  const needle = term.trim().toLowerCase();
  if (!needle) return undefined;

  // `0001` and `AR No. 0001` name the same record, so the number takes both.
  if (
    referenceSearchTerms(term).some((spelling) => contains(row.referenceNo, spelling.toLowerCase()))
  ) {
    return 'reference';
  }
  if (contains(row.title, needle)) return 'title';
  if (contains(row.narrative, needle)) return 'narrative';
  if (contains(row.location, needle)) return 'location';
  if (contains(row.picNames, needle)) return 'pic';

  return undefined;
}

/** The stored row as the palette contract, preview context included. */
export function toReportSearchItem(row: ReportSearchRow, term: string): ReportSearchItem {
  const matched = matchOf(row, term);
  const snippet = matched === 'narrative' ? snippetAround(row.narrative, term) : undefined;

  return {
    id: row.id,
    referenceNo: row.referenceNo,
    title: row.title,
    type: row.type,
    status: row.status,
    activityStartDate: row.activityStartDate,
    activityEndDate: row.activityEndDate,
    location: row.location,
    picNames: row.picNames,
    updatedAt: row.updatedAt,
    classification: row.classification,
    unitName: row.unitName,
    ...(row.submittedAt ? { submittedAt: row.submittedAt } : {}),
    ...(row.archivedAt ? { archivedAt: row.archivedAt } : {}),
    ...(matched ? { matched } : {}),
    ...(snippet ? { snippet } : {}),
  };
}
