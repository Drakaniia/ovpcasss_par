import { actsAs } from '@par/shared';
import type {
  ReportDraft,
  ReportListItem,
  ReportSortField,
  ReportStatus,
  Role,
  SortDirection,
} from '@par/shared';

import { formatDateTime, formatDateRange } from '$lib/format/datetime';
import { REPORT_TYPE_LABELS } from '$lib/format/report-type';
import { formatRelativeTime } from '$lib/format/relative-time';

import { defaultDirectionFor, type ReportFilters } from './report-filters';

/**
 * Table rows and sorting for My reports (UI spec §7.4, §8.3). Edit and Delete
 * belong to the owning submitter; every other role reads the same table.
 */

/** Workflow order, not alphabetical; both return statuses share one stage. */
const STATUS_RANK: Record<ReportStatus, number> = {
  DRAFT: 0,
  SUBMITTED: 1,
  RESUBMITTED: 2,
  RETURNED_BY_REVIEWER: 3,
  RETURNED_BY_APPROVER: 3,
  ENDORSED: 4,
  APPROVED: 5,
};

export function statusRank(status: ReportStatus): number {
  return STATUS_RANK[status];
}

function timeValue(value: string): number {
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function compareItems(a: ReportListItem, b: ReportListItem, field: ReportSortField): number {
  switch (field) {
    case 'trackingNumber':
      return (a.trackingNumber ?? '').localeCompare(b.trackingNumber ?? '', 'en', {
        numeric: true,
      });
    case 'activityDate':
      return timeValue(a.activityStartDate) - timeValue(b.activityStartDate);
    case 'status':
      return statusRank(a.status) - statusRank(b.status);
    case 'updated':
      return timeValue(a.updatedAt) - timeValue(b.updatedAt);
  }
}

export function sortReportItems(
  items: readonly ReportListItem[],
  sort: ReportSortField,
  dir: SortDirection,
): ReportListItem[] {
  const factor = dir === 'asc' ? 1 : -1;
  return [...items].sort((a, b) => factor * compareItems(a, b, sort));
}

export function sortDirectionFor(
  filters: ReportFilters,
  field: ReportSortField,
): 'ascending' | 'descending' | 'none' {
  if (filters.sort !== field) return 'none';
  return filters.dir === 'asc' ? 'ascending' : 'descending';
}

/** Clicking the active header toggles; a new header starts at its default. */
export function toggledSort(
  filters: ReportFilters,
  field: ReportSortField,
): Pick<ReportFilters, 'sort' | 'dir'> {
  if (filters.sort !== field) return { sort: field, dir: defaultDirectionFor(field) };
  return { sort: field, dir: filters.dir === 'asc' ? 'desc' : 'asc' };
}

export type ReportRowAction = { visible: boolean; enabled: boolean; reason?: string };
export type ReportRowActions = { edit: ReportRowAction; delete: ReportRowAction };

export type ReportRow = {
  id: string;
  href: string;
  title: string;
  trackingNumber: string | null;
  typeLabel: string;
  status: ReportStatus;
  activityDate: string;
  updatedRelative: string;
  updatedExact: string;
  pendingSync: boolean;
  actions: ReportRowActions;
};

const HIDDEN_ACTION: ReportRowAction = { visible: false, enabled: false };

export function isReturnedStatus(status: ReportStatus): boolean {
  return status === 'RETURNED_BY_REVIEWER' || status === 'RETURNED_BY_APPROVER';
}

export function isEditableStatus(status: ReportStatus): boolean {
  return status === 'DRAFT' || isReturnedStatus(status);
}

/** Drafts open the edit page; every other row opens the facsimile. */
export function rowHref(id: string, status: ReportStatus): string {
  return status === 'DRAFT' ? `/reports/${id}/edit` : `/reports/${id}`;
}

export function rowActionsFor(
  role: Role | null | undefined,
  ownerUserId: string,
  userId: string | null | undefined,
  status: ReportStatus,
  sending = false,
): ReportRowActions {
  const owns = actsAs(role, 'SUBMITTER') && Boolean(userId) && ownerUserId === userId;

  return {
    edit: owns && isEditableStatus(status) ? { visible: true, enabled: true } : HIDDEN_ACTION,
    delete:
      owns && status === 'DRAFT'
        ? sending
          ? {
              visible: true,
              enabled: false,
              reason: 'This draft is still being sent to the server.',
            }
          : { visible: true, enabled: true }
        : HIDDEN_ACTION,
  };
}

export function reportRowFromItem(
  item: ReportListItem,
  options: { role: Role | null | undefined; userId: string | null | undefined; now?: Date },
): ReportRow {
  const now = options.now ?? new Date();

  return {
    id: item.id,
    href: rowHref(item.id, item.status),
    title: item.title,
    trackingNumber: item.trackingNumber,
    typeLabel: REPORT_TYPE_LABELS[item.type],
    status: item.status,
    activityDate: formatDateRange(item.activityStartDate, item.activityEndDate),
    updatedRelative: formatRelativeTime(item.updatedAt, now),
    updatedExact: formatDateTime(item.updatedAt),
    pendingSync: false,
    actions: rowActionsFor(options.role, item.ownerUserId, options.userId, item.status),
  };
}

/**
 * The part of the filter state a device-only draft is judged by. A term is
 * resolved to a date window on the server, so it cannot be evaluated here.
 */
export type PendingRowScope = Pick<
  ReportFilters,
  'tab' | 'type' | 'campusId' | 'termId' | 'from' | 'to' | 'q' | 'page'
>;

/** A draft row is still a `DRAFT`, so it obeys the same tab and filters. */
function draftMatches(draft: ReportDraft, scope: PendingRowScope): boolean {
  if (scope.tab !== 'all' && scope.tab !== 'drafts') return false;
  // Drafts lead the unsorted first page only; paging moves through server rows.
  if (scope.page > 1) return false;
  if (scope.termId) return false;

  const form = draft.form;
  if (scope.type && form.type !== scope.type) return false;
  if (scope.campusId && form.campusId !== scope.campusId) return false;

  const start = form.activityStartDate ?? '';
  if (scope.from && (!start || start < scope.from)) return false;
  if (scope.to && (!start || start > scope.to)) return false;

  const term = scope.q.trim().toLowerCase();
  return term === '' || (form.title ?? '').toLowerCase().includes(term);
}

/**
 * Device-only drafts precede the sorted server rows regardless of the active
 * sort (§4). A draft the server already knows is a server row, and a draft
 * belongs to the account that created it, never to whoever is signed in next.
 */
export function pendingRowsFromDrafts(
  drafts: readonly ReportDraft[],
  options: {
    ownerUserId?: string | null;
    role?: Role | null;
    now?: Date;
    scope?: Partial<PendingRowScope>;
  } = {},
): ReportRow[] {
  const now = options.now ?? new Date();
  const owner = options.ownerUserId ?? null;
  // Only a submitter files reports, so only a submitter's device copies are rows.
  if (!owner || !actsAs(options.role, 'SUBMITTER')) return [];
  const scope: PendingRowScope = {
    tab: 'all',
    type: '',
    campusId: '',
    termId: '',
    from: '',
    to: '',
    q: '',
    page: 1,
    ...options.scope,
  };

  return drafts
    .filter(
      (draft) =>
        !draft.serverId &&
        draft.ownerUserId === owner &&
        draftMatches(draft, scope),
    )
    .sort((a, b) => timeValue(b.updatedAt) - timeValue(a.updatedAt))
    .map((draft) => {
      const start = draft.form.activityStartDate ?? '';
      const end = draft.form.activityEndDate ?? '';

      return {
        id: draft.id,
        href: `/reports/${draft.id}/edit`,
        title: draft.form.title?.trim() || 'Untitled draft',
        trackingNumber: null,
        typeLabel: draft.form.type ? REPORT_TYPE_LABELS[draft.form.type] : '—',
        status: 'DRAFT' as const,
        activityDate: start && end ? formatDateRange(start, end) : '—',
        updatedRelative: formatRelativeTime(draft.updatedAt, now),
        updatedExact: formatDateTime(draft.updatedAt),
        pendingSync: true,
        actions: rowActionsFor(options.role, owner, owner, 'DRAFT'),
      };
    });
}
