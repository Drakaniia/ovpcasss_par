import type { ReportListPage, ReportReadQueries } from '@par/db';
import type { RegisterPdfRow } from '@par/export';
import type { ReportListQuery, ReportType } from '@par/shared';

/** One export guards against a runaway file; the office narrows the filters. */
export const REGISTER_EXPORT_CAP = 1000;

const TYPE_LABELS: Record<ReportType, string> = {
  OFF_CAMPUS: 'Off-campus',
  EDUCATIONAL_TOUR: 'Educational tour',
  IN_CAMPUS: 'In-campus',
};

const TAB_LABELS: Record<ReportListQuery['tab'], string> = {
  all: 'All records',
  pending: 'Pending',
  submitted: 'Submitted',
  returned: 'Returned',
  approved: 'Approved',
};

export interface RegisterExport {
  rows: RegisterPdfRow[];
  filterSummary: string;
  total: number;
}

export type RegisterAssembly = { ok: true; export: RegisterExport } | { ok: false; total: number };

function filterSummary(
  query: ReportListQuery,
  facets: { campuses: { id: string; label: string }[]; terms: { id: string; label: string }[] },
): string {
  const parts: string[] = [TAB_LABELS[query.tab]];

  if (query.archived === 'archived') parts.push('Archived only');
  if (query.archived === 'all') parts.push('Active and archived');
  if (query.type) parts.push(TYPE_LABELS[query.type]);
  if (query.campus) {
    parts.push(facets.campuses.find((campus) => campus.id === query.campus)?.label ?? 'Campus');
  }
  if (query.term) {
    parts.push(facets.terms.find((term) => term.id === query.term)?.label ?? 'Term');
  }
  if (query.from || query.to) {
    parts.push(`Activity ${query.from ?? 'earliest'} to ${query.to ?? 'latest'}`);
  }
  if (query.picName) parts.push(`Personnel in charge: ${query.picName}`);
  if (query.submittedBy) parts.push(`Submitted by: ${query.submittedBy}`);
  if (query.q) parts.push(`Keyword: ${query.q}`);

  return parts.join(' \u00b7 ');
}

/** Rows for the filtered register, capped before a single PDF byte is drawn. */
export async function assembleRegister(
  read: ReportReadQueries,
  query: ReportListQuery,
): Promise<RegisterAssembly> {
  const page: ReportListPage = await read.list({
    viewer: { userId: '', isAdmin: true },
    tab: query.tab,
    archived: query.archived,
    ...(query.type ? { type: query.type } : {}),
    ...(query.campus ? { campus: query.campus } : {}),
    ...(query.from ? { from: query.from } : {}),
    ...(query.to ? { to: query.to } : {}),
    ...(query.q ? { q: query.q } : {}),
    ...(query.picName ? { picName: query.picName } : {}),
    ...(query.submittedBy ? { submittedBy: query.submittedBy } : {}),
    sort: query.sort,
    dir: query.dir,
    page: 1,
    size: REGISTER_EXPORT_CAP + 1,
  });

  if (page.total > REGISTER_EXPORT_CAP) return { ok: false, total: page.total };

  const submitters = await read.submitterNames(page.rows.map((row) => row.id));
  const rows: RegisterPdfRow[] = [];

  for (const row of page.rows) {
    const pics = await read.listPics(row.id);
    rows.push({
      referenceNo: row.referenceNo,
      title: row.title,
      type: TYPE_LABELS[row.type],
      activityStartDate: row.activityStartDate,
      activityEndDate: row.activityEndDate,
      location: row.location,
      picNames: pics.map((pic) => pic.name).join(', '),
      submittedByName: submitters.get(row.id) ?? '',
      submittedAt: row.submittedAt ?? '',
      status: row.status,
      approvedAt: row.approvedAt ?? '',
    });
  }

  return {
    ok: true,
    export: {
      rows,
      filterSummary: filterSummary(query, await read.listFacets()),
      total: page.total,
    },
  };
}
