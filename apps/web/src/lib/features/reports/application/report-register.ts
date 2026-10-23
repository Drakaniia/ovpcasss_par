import type { ReportListItem, ReportListTab, Role } from '@par/shared';

import { formatDateRange } from '$lib/format/datetime';
import { formatRelativeTime } from '$lib/format/relative-time';
import { REPORT_TYPE_LABELS } from '$lib/format/report-type';

export type RegisterRow = {
  id: string;
  href: string;
  referenceNo: string;
  title: string;
  meta: string;
  picNames: string;
  status: ReportListItem['status'];
  updatedAt: string;
  /** The row's own primary action: write the narrative, or open the record. */
  action: { label: string; href: string };
  canEdit: boolean;
  canDelete: boolean;
  canResend: boolean;
};

export function registerRow(item: ReportListItem, options: { role: Role | null }): RegisterRow {
  const admin = options.role === 'ADMIN';
  const writable = item.status === 'DRAFT' || item.status === 'RETURNED';

  return {
    id: item.id,
    href: `/reports/${item.id}`,
    referenceNo: item.referenceNo,
    title: item.title,
    meta: `${REPORT_TYPE_LABELS[item.type]} · ${formatDateRange(
      item.activityStartDate,
      item.activityEndDate,
    )}${item.location ? ` · ${item.location}` : ''}`,
    picNames: item.picNames || '—',
    status: item.status,
    updatedAt: item.updatedAt,
    action: admin
      ? { label: 'View', href: `/reports/${item.id}` }
      : writable
        ? {
            label: item.status === 'RETURNED' ? 'Revise and resubmit' : 'Write narrative',
            href: `/reports/${item.id}`,
          }
        : { label: 'View', href: `/reports/${item.id}` },
    canEdit: admin && item.status !== 'APPROVED',
    canDelete: admin && item.status === 'DRAFT',
    canResend: admin && (item.status === 'DRAFT' || item.status === 'RETURNED'),
  };
}

export function updatedLabel(updatedAt: string, now = new Date()): string {
  return formatRelativeTime(updatedAt, now);
}

export type RegisterEmptyState = {
  title: string;
  description: string;
  action?: { label: string; href: string };
};

export function emptyStateFor(
  tab: ReportListTab,
  options: { role: Role | null; hasFilters: boolean },
): RegisterEmptyState {
  const admin = options.role === 'ADMIN';

  if (options.hasFilters) {
    return {
      title: 'No records match these filters',
      description: 'Clear the filters to see the whole register.',
    };
  }

  switch (tab) {
    case 'withPic':
      return {
        title: 'No records are with personnel in charge',
        description:
          'A record appears here after the office creates it and before its narrative is submitted.',
      };
    case 'submitted':
      return {
        title: 'No narrative is awaiting a decision',
        description: 'Submitted narratives appear here for the office to approve or return.',
      };
    case 'returned':
      return {
        title: 'No records have been returned',
        description: 'A record sent back for revision appears here with the office comments.',
      };
    case 'approved':
      return {
        title: 'No records are approved yet',
        description: 'Approved records and their acknowledgment receipts appear here.',
      };
    default:
      return admin
        ? {
            title: 'The register is empty',
            description:
              'Create the first record. The office mints AR No. 0001 and hands it to the personnel in charge.',
            action: { label: 'New record', href: '/reports/new' },
          }
        : {
            title: 'No activities are assigned to you yet',
            description:
              'The OVPCASSS office adds the personnel in charge for each activity. Your records appear here.',
          };
  }
}

/** `AR No. 0001` sorts by its number, not by its text. */
export function referenceSequence(referenceNo: string): number {
  const digits = referenceNo.replace(/\D/g, '');
  return digits ? Number(digits) : 0;
}
