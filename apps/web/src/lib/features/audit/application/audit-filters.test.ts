import { describe, expect, it } from 'vitest';

import {
  activeAuditChips,
  activeFilterCount,
  clearedFilters,
  filtersFromParams,
  filtersToParams,
  filtersToQuery,
  hasActiveFilters,
  removeAuditChip,
  validateDateRange,
  type AuditFilters,
} from './audit-filters';

describe('audit-filters', () => {
  it('parses filters from URL search params', () => {
    const params = new URLSearchParams(
      'actor=Santos&action=ENDORSED&entityType=report&entityId=OFF-2026-0014&from=2026-10-01&to=2026-10-31&fromStatus=SUBMITTED&toStatus=ENDORSED&page=3',
    );
    const filters = filtersFromParams(params);
    expect(filters.actor).toBe('Santos');
    expect(filters.action).toBe('ENDORSED');
    expect(filters.entityType).toBe('report');
    expect(filters.entityId).toBe('OFF-2026-0014');
    expect(filters.from).toBe('2026-10-01');
    expect(filters.to).toBe('2026-10-31');
    expect(filters.fromStatus).toBe('SUBMITTED');
    expect(filters.toStatus).toBe('ENDORSED');
    expect(filters.page).toBe(3);
  });

  it('serializes filters to URL search params', () => {
    const filters: AuditFilters = {
      actor: 'Santos',
      action: 'ENDORSED',
      entityType: '',
      entityId: '',
      from: '2026-10-01',
      to: '2026-10-31',
      fromStatus: '',
      toStatus: '',
      page: 1,
    };
    const params = filtersToParams(filters);
    expect(params).toBe('actor=Santos&action=ENDORSED&from=2026-10-01&to=2026-10-31');
  });

  it('converts date filters to Asia/Manila boundaries for API query', () => {
    const filters: AuditFilters = {
      actor: 'Santos',
      action: '',
      entityType: '',
      entityId: '',
      from: '2026-10-17',
      to: '2026-10-17',
      fromStatus: '',
      toStatus: '',
      page: 1,
    };
    const query = filtersToQuery(filters);
    expect(query.from).toBe('2026-10-16T16:00:00.000Z');
    expect(query.to).toBe('2026-10-17T15:59:59.999Z');
  });

  it('validates date range', () => {
    expect(validateDateRange('2026-10-01', '2026-10-15').valid).toBe(true);
    expect(validateDateRange('2026-10-15', '2026-10-15').valid).toBe(true);
    const invalid = validateDateRange('2026-10-16', '2026-10-15');
    expect(invalid.valid).toBe(false);
    expect(invalid.error).toContain('cannot be after');
  });

  it('detects active filters and counts them', () => {
    const empty: AuditFilters = {
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
    expect(hasActiveFilters(empty)).toBe(false);
    expect(activeFilterCount(empty)).toBe(0);

    const active: AuditFilters = {
      ...empty,
      actor: 'Admin',
      action: 'LOGIN',
    };
    expect(hasActiveFilters(active)).toBe(true);
    expect(activeFilterCount(active)).toBe(2);
  });

  it('generates active chips and handles removal', () => {
    const filters: AuditFilters = {
      actor: 'Santos',
      action: 'ENDORSED',
      entityType: 'report',
      entityId: 'OFF-1',
      from: '2026-10-01',
      to: '2026-10-05',
      fromStatus: 'SUBMITTED',
      toStatus: 'ENDORSED',
      page: 2,
    };
    const chips = activeAuditChips(filters);
    expect(chips.length).toBe(6); // actor, action, entityType, entityId, date, status

    const withoutActor = removeAuditChip(filters, 'actor');
    expect(withoutActor.actor).toBe('');
    expect(withoutActor.page).toBe(1);

    const withoutDate = removeAuditChip(filters, 'date');
    expect(withoutDate.from).toBe('');
    expect(withoutDate.to).toBe('');

    const cleared = clearedFilters(filters);
    expect(hasActiveFilters(cleared)).toBe(false);
    expect(cleared.page).toBe(1);
  });
});
