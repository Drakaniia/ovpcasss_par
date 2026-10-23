import type { ReportListItem, ReportListQuery, ReportListTab, ReportPageSize } from '@par/shared';
import { REPORT_PAGE_SIZES } from '@par/shared';

import { formatDateRange } from '$lib/format/datetime';
import { REPORT_TYPE_LABELS } from '$lib/format/report-type';

/**
 * The personnel workspace (spec §8.2): one list of the records that name the
 * account, with a status-appropriate action and no second page. The server
 * scopes the list to PIC membership; the filters are status and activity dates.
 */

export type PersonnelRow = {
  id: string;
  href: string;
  referenceNo: string;
  title: string;
  meta: string;
  dates: string;
  location: string;
  status: ReportListItem['status'];
  archived: boolean;
  /** The row's own action; the AR No. and title always open the record too. */
  action: { label: string; href: string };
};

export function personnelRow(item: ReportListItem): PersonnelRow {
  const href = `/reports/${item.id}`;

  return {
    id: item.id,
    href,
    referenceNo: item.referenceNo,
    title: item.title,
    meta: REPORT_TYPE_LABELS[item.type],
    dates: formatDateRange(item.activityStartDate, item.activityEndDate),
    location: item.location,
    status: item.status,
    archived: Boolean(item.archivedAt),
    action: {
      label:
        item.status === 'PENDING'
          ? 'Write narrative'
          : item.status === 'RETURNED'
            ? 'Revise and resubmit'
            : 'View',
      href,
    },
  };
}

export function personnelRows(items: readonly ReportListItem[]): PersonnelRow[] {
  return items.map(personnelRow);
}

export type PersonnelFilters = {
  status: ReportListTab;
  from: string;
  to: string;
  q: string;
  page: number;
  pageSize: ReportPageSize;
};

export const DEFAULT_PERSONNEL_FILTERS: PersonnelFilters = {
  status: 'all',
  from: '',
  to: '',
  q: '',
  page: 1,
  pageSize: 25,
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isoDate(value: string | null): string {
  return value !== null && ISO_DATE.test(value) ? value : '';
}

export function personnelFiltersFromParams(params: URLSearchParams): PersonnelFilters {
  const status = params.get('tab');
  const size = Number(params.get('size'));
  const page = Number(params.get('page'));

  return {
    status:
      status === 'pending' ||
      status === 'submitted' ||
      status === 'returned' ||
      status === 'approved'
        ? status
        : 'all',
    from: isoDate(params.get('from')),
    to: isoDate(params.get('to')),
    q: params.get('q')?.trim().slice(0, 120) ?? '',
    page: Number.isInteger(page) && page > 0 ? page : 1,
    pageSize: (REPORT_PAGE_SIZES as readonly number[]).includes(size)
      ? (size as ReportPageSize)
      : DEFAULT_PERSONNEL_FILTERS.pageSize,
  };
}

export function personnelFiltersToParams(filters: PersonnelFilters): string {
  const params = new URLSearchParams();

  if (filters.status !== 'all') params.set('tab', filters.status);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.q) params.set('q', filters.q);
  if (filters.page > 1) params.set('page', String(filters.page));
  if (filters.pageSize !== DEFAULT_PERSONNEL_FILTERS.pageSize) {
    params.set('size', String(filters.pageSize));
  }

  return params.toString();
}

export function personnelFiltersToQuery(filters: PersonnelFilters): ReportListQuery {
  return {
    tab: filters.status,
    archived: 'all',
    from: filters.from || undefined,
    to: filters.to || undefined,
    q: filters.q || undefined,
    sort: 'updated',
    dir: 'desc',
    page: filters.page,
    size: filters.pageSize,
  };
}

export function updatePersonnelFilters(
  current: PersonnelFilters,
  patch: Partial<PersonnelFilters>,
): PersonnelFilters {
  const next = { ...current, ...patch };
  const rescopes = (['status', 'from', 'to', 'q', 'pageSize'] as const).some((key) => key in patch);
  if (rescopes && patch.page === undefined) next.page = 1;
  return next;
}

export function hasPersonnelFilters(filters: PersonnelFilters): boolean {
  return filters.status !== 'all' || filters.from !== '' || filters.to !== '' || filters.q !== '';
}
