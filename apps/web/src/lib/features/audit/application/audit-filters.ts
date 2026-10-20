import type { AdminAuditListQuery } from '@par/shared';

export interface AuditFilters {
  actor: string;
  action: string;
  entityType: string;
  entityId: string;
  from: string;
  to: string;
  fromStatus: string;
  toStatus: string;
  page: number;
}

export const DEFAULT_AUDIT_FILTERS: AuditFilters = {
  actor: '',
  action: '',
  entityType: '',
  entityId: '',
  from: '',
  to: '',
  fromStatus: '',
  toStatus: '',
  page: 1,
};

export function filtersFromParams(params: URLSearchParams): AuditFilters {
  const pageRaw = Number(params.get('page'));
  return {
    actor: params.get('actor') ?? '',
    action: params.get('action') ?? '',
    entityType: params.get('entityType') ?? '',
    entityId: params.get('entityId') ?? '',
    from: params.get('from') ?? '',
    to: params.get('to') ?? '',
    fromStatus: params.get('fromStatus') ?? '',
    toStatus: params.get('toStatus') ?? '',
    page: Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1,
  };
}

export function filtersToParams(filters: AuditFilters): string {
  const params = new URLSearchParams();
  if (filters.actor) params.set('actor', filters.actor);
  if (filters.action) params.set('action', filters.action);
  if (filters.entityType) params.set('entityType', filters.entityType);
  if (filters.entityId) params.set('entityId', filters.entityId);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.fromStatus) params.set('fromStatus', filters.fromStatus);
  if (filters.toStatus) params.set('toStatus', filters.toStatus);
  if (filters.page > 1) params.set('page', String(filters.page));
  return params.toString();
}

/** Converts date string (YYYY-MM-DD) in Asia/Manila (+08:00) to UTC ISO string. */
function toManilaBoundary(dateStr: string, isEnd: boolean): string {
  const time = isEnd ? '23:59:59.999' : '00:00:00.000';
  const iso = new Date(`${dateStr}T${time}+08:00`).toISOString();
  return iso;
}

export function filtersToQuery(filters: AuditFilters): AdminAuditListQuery {
  return {
    actor: filters.actor || undefined,
    action: filters.action || undefined,
    entityType: filters.entityType || undefined,
    entityId: filters.entityId || undefined,
    from: filters.from ? toManilaBoundary(filters.from, false) : undefined,
    to: filters.to ? toManilaBoundary(filters.to, true) : undefined,
    fromStatus: filters.fromStatus || undefined,
    toStatus: filters.toStatus || undefined,
    page: filters.page,
    limit: 50,
  };
}

export function validateDateRange(from: string, to: string): { valid: boolean; error?: string } {
  if (from && to && from > to) {
    return { valid: false, error: "The 'from' date cannot be after the 'to' date." };
  }
  return { valid: true };
}

export function filtersEqual(a: AuditFilters, b: AuditFilters): boolean {
  return (
    a.actor === b.actor &&
    a.action === b.action &&
    a.entityType === b.entityType &&
    a.entityId === b.entityId &&
    a.from === b.from &&
    a.to === b.to &&
    a.fromStatus === b.fromStatus &&
    a.toStatus === b.toStatus &&
    a.page === b.page
  );
}

export function hasActiveFilters(filters: AuditFilters): boolean {
  return Boolean(
    filters.actor ||
      filters.action ||
      filters.entityType ||
      filters.entityId ||
      filters.from ||
      filters.to ||
      filters.fromStatus ||
      filters.toStatus,
  );
}

export function activeFilterCount(filters: AuditFilters): number {
  let count = 0;
  if (filters.actor) count++;
  if (filters.action) count++;
  if (filters.entityType) count++;
  if (filters.entityId) count++;
  if (filters.from || filters.to) count++;
  if (filters.fromStatus || filters.toStatus) count++;
  return count;
}

export function clearedFilters(_current: AuditFilters): AuditFilters {
  return { ...DEFAULT_AUDIT_FILTERS, page: 1 };
}

export interface AuditChip {
  id: string;
  label: string;
  value: string;
  field: keyof AuditFilters | 'date' | 'status';
}

export function activeAuditChips(filters: AuditFilters): AuditChip[] {
  const chips: AuditChip[] = [];

  if (filters.actor) {
    chips.push({ id: 'actor', label: 'Actor', value: filters.actor, field: 'actor' });
  }
  if (filters.action) {
    chips.push({ id: 'action', label: 'Action', value: filters.action, field: 'action' });
  }
  if (filters.entityType) {
    chips.push({ id: 'entityType', label: 'Entity type', value: filters.entityType, field: 'entityType' });
  }
  if (filters.entityId) {
    chips.push({ id: 'entityId', label: 'Entity ID', value: filters.entityId, field: 'entityId' });
  }
  if (filters.from || filters.to) {
    const val = filters.from && filters.to
      ? `${filters.from} – ${filters.to}`
      : filters.from
        ? `From ${filters.from}`
        : `To ${filters.to}`;
    chips.push({ id: 'date', label: 'Date', value: val, field: 'date' });
  }
  if (filters.fromStatus || filters.toStatus) {
    const val = filters.fromStatus && filters.toStatus
      ? `${filters.fromStatus} → ${filters.toStatus}`
      : filters.fromStatus
        ? `From ${filters.fromStatus}`
        : `To ${filters.toStatus}`;
    chips.push({ id: 'status', label: 'Status change', value: val, field: 'status' });
  }

  return chips;
}

export function removeAuditChip(
  filters: AuditFilters,
  field: keyof AuditFilters | 'date' | 'status',
): AuditFilters {
  const next = { ...filters, page: 1 };
  if (field === 'date') {
    next.from = '';
    next.to = '';
  } else if (field === 'status') {
    next.fromStatus = '';
    next.toStatus = '';
  } else if (field in next) {
    (next as Record<string, unknown>)[field] = '';
  }
  return next;
}
