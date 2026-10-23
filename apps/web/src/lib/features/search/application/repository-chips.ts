import type { ReportFilterOption, RepositoryFacets, RepositoryStatus } from '@par/shared';
import { REPOSITORY_DEFAULT_STATUS } from '@par/shared';

import { formatDate } from '$lib/format/datetime';
import { REPORT_TYPE_LABELS } from '$lib/format/report-type';
import { classificationLabel, levelLabel } from '$lib/features/reports/application/record-form';
import { STATUS_PRESENTATION } from '$lib/status/report-status';

import type { RepositoryFilters } from './repository-filters';
import { activeFilterCount } from './repository-filter-scope';

/**
 * The chips under the search field and the scope line above the results (UI spec
 * §7.11 §2, §3). Type, term, and status are always visible as their own controls,
 * so they are echoed but never duplicated as chips.
 */
export type RepositoryChipId =
  | 'reference'
  | 'title'
  | 'classification'
  | 'campus'
  | 'college'
  | 'term'
  | 'department'
  | 'office'
  | 'level'
  | 'sdg'
  | 'received'
  | 'activity'
  | 'pic';

export type RepositoryChip = {
  id: RepositoryChipId;
  label: string;
  /** A saved URL may reference a deactivated value; show it, do not drop it. */
  inactive?: boolean;
  title?: string;
};

const INACTIVE_TITLE = 'This value is no longer in the reference data.';

/** Status wording comes from the shared status map, never from a second list. */
export function statusLabel(status: RepositoryStatus): string {
  return STATUS_PRESENTATION[status].label;
}

export function activeChips(
  filters: RepositoryFilters,
  facets: RepositoryFacets | null,
): RepositoryChip[] {
  const chips: RepositoryChip[] = [];

  if (filters.reference) chips.push({ id: 'reference', label: `AR No.: ${filters.reference}` });
  if (filters.title) chips.push({ id: 'title', label: `Title: ${filters.title}` });
  if (filters.classification) {
    chips.push({
      id: 'classification',
      label: `Classification: ${classificationLabel(filters.classification)}`,
    });
  }

  for (const [id, value, options] of [
    ['campus', filters.campusId, facets?.campuses],
    ['college', filters.collegeId, facets?.colleges],
    ['term', filters.termId, facets?.terms],
  ] as const) {
    if (!value) continue;
    const option = options?.find((entry) => entry.id === value);
    chips.push({
      id,
      label: referenceChip(id, value, option),
      inactive: !option || !option.isActive,
      title: option ? undefined : INACTIVE_TITLE,
    });
  }

  if (filters.department)
    chips.push({ id: 'department', label: `Department: ${filters.department}` });
  if (filters.office) chips.push({ id: 'office', label: `Office: ${filters.office}` });
  if (filters.level) chips.push({ id: 'level', label: `Level: ${levelLabel(filters.level)}` });
  if (filters.sdgIds.length > 0) {
    chips.push({ id: 'sdg', label: `SDG: ${sdgLabels(filters.sdgIds, facets)}` });
  }
  if (filters.receivedFrom || filters.receivedTo) {
    chips.push({
      id: 'received',
      label: `Received ${rangeLabel(filters.receivedFrom, filters.receivedTo)}`,
    });
  }
  if (filters.activityFrom || filters.activityTo) {
    chips.push({
      id: 'activity',
      label: `Activity ${rangeLabel(filters.activityFrom, filters.activityTo)}`,
    });
  }
  if (filters.pic) chips.push({ id: 'pic', label: `PIC: ${filters.pic}` });

  return chips;
}

function referenceChip(
  id: 'campus' | 'college' | 'term',
  value: string,
  option: ReportFilterOption | undefined,
): string {
  const heading = id === 'campus' ? 'Campus' : id === 'college' ? 'College' : 'Term';
  if (option) return `${heading}: ${option.label}${option.isActive ? '' : ' (inactive)'}`;
  return `${heading}: ${value}`;
}

/**
 * The SDG option label is `4 Quality education`; the chip only needs the number,
 * which keeps a multi-select readable.
 */
function sdgLabels(ids: readonly string[], facets: RepositoryFacets | null): string {
  return ids
    .map((id) => facets?.sdgs.find((sdg) => sdg.id === id)?.label.split(' ')[0] ?? id)
    .join(', ');
}

function rangeLabel(from: string, to: string): string {
  if (from && to) return `${formatDate(from)} – ${formatDate(to)}`;
  if (from) return `from ${formatDate(from)}`;
  return `to ${formatDate(to)}`;
}

export function removedFilter(id: RepositoryChipId): Partial<RepositoryFilters> {
  switch (id) {
    case 'reference':
      return { reference: '' };
    case 'title':
      return { title: '' };
    case 'classification':
      return { classification: '' };
    case 'campus':
      return { campusId: '' };
    case 'college':
      return { collegeId: '' };
    case 'term':
      return { termId: '' };
    case 'department':
      return { department: '' };
    case 'office':
      return { office: '' };
    case 'level':
      return { level: '' };
    case 'sdg':
      return { sdgIds: [] };
    case 'received':
      return { receivedFrom: '', receivedTo: '' };
    case 'activity':
      return { activityFrom: '', activityTo: '' };
    case 'pic':
      return { pic: '' };
  }
}

/** Every active filter in panel order; the three quick controls are included. */
export function activeFilterLabels(
  filters: RepositoryFilters,
  facets: RepositoryFacets | null,
): string[] {
  const labels: string[] = [];

  if (filters.q) labels.push(`Search: ${filters.q}`);
  if (filters.type) labels.push(`Type: ${REPORT_TYPE_LABELS[filters.type]}`);
  if (filters.termId) {
    const term = facets?.terms.find((entry) => entry.id === filters.termId);
    labels.push(`Term: ${term?.label ?? filters.termId}`);
  }
  if (filters.status !== REPOSITORY_DEFAULT_STATUS) {
    labels.push(`Status: ${statusLabel(filters.status)}`);
  }

  for (const chip of activeChips(filters, facets)) labels.push(chip.label);

  return labels;
}

/** "Type: Off-campus · Status: Approved · 3 filters" (§3). */
export function filterEcho(filters: RepositoryFilters, facets: RepositoryFacets | null): string {
  const labels = activeFilterLabels(filters, facets);
  if (labels.length === 0) return '';

  const shown = labels.slice(0, 3).join(' · ');
  const count = activeFilterCount(filters);
  return count > 1 ? `${shown} · ${count} filters` : shown;
}
