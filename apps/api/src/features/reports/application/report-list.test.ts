import type { ReportListQuery } from '@par/shared';
import { describe, expect, it } from 'vitest';

import { reportListFilter } from './report-list';

const query: ReportListQuery = {
  tab: 'all',
  sort: 'updated',
  dir: 'desc',
  page: 1,
  size: 25,
};

describe('report list filter', () => {
  it('scopes every role to the caller’s own reports', () => {
    for (const role of ['SUBMITTER', 'REVIEWER', 'APPROVER', 'ADMIN'] as const) {
      expect(reportListFilter({ userId: 'u1', role }, query, {}).ownerUserId).toBe('u1');
    }
  });

  it('expands a term into an activity-date window', () => {
    const filter = reportListFilter({ userId: 'u1', role: 'SUBMITTER' }, query, {
      from: '2026-01-01',
      to: '2026-06-30',
    });

    expect(filter).toMatchObject({ from: '2026-01-01', to: '2026-06-30' });
  });

  it('omits an empty window so the date filter stays unset', () => {
    const filter = reportListFilter({ userId: 'u1', role: 'SUBMITTER' }, query, {});

    expect('from' in filter).toBe(false);
    expect('to' in filter).toBe(false);
  });
});
