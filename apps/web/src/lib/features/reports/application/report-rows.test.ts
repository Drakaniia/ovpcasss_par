import type { ReportDraft, ReportListItem } from '@par/shared';
import { describe, expect, it } from 'vitest';

import { DEFAULT_REPORT_FILTERS } from './report-filters';
import {
  pendingRowsFromDrafts,
  reportRowFromItem,
  rowActionsFor,
  rowHref,
  sortDirectionFor,
  sortReportItems,
  toggledSort,
  type PendingRowScope,
} from './report-rows';

const NOW = new Date('2026-03-16T00:00:00.000Z');

const item = (overrides: Partial<ReportListItem> = {}): ReportListItem => ({
  id: 'r1',
  ownerUserId: 'u1',
  trackingNumber: 'OFF-2026-0001',
  title: 'Marine survey',
  type: 'OFF_CAMPUS',
  status: 'SUBMITTED',
  activityStartDate: '2026-03-12',
  activityEndDate: '2026-03-12',
  updatedAt: '2026-03-14T01:12:00.000Z',
  ...overrides,
});

const draft = (overrides: Partial<ReportDraft> = {}): ReportDraft => ({
  id: 'd1',
  ownerUserId: 'u1',
  version: 1,
  updatedAt: '2026-03-15T01:12:00.000Z',
  form: {
    type: 'IN_CAMPUS',
    classification: 'CURRICULAR',
    campusId: 'c1',
    unitId: 'un1',
    level: 'UNDERGRADUATE',
    title: 'Coastal cleanup',
    activityStartDate: '2026-03-12',
    activityEndDate: '2026-03-13',
    location: 'Gymnasium',
    totalStudents: 10,
    totalPic: 1,
    pics: [{ name: 'A. Cruz', phone: '0917 000 0000' }],
    sdgIds: ['s1'],
    narrative: 'Summary',
  },
  ...overrides,
});

describe('sorting', () => {
  it('sorts status by workflow order, not alphabetically', () => {
    const rows = sortReportItems(
      [
        item({ id: 'a', status: 'APPROVED', trackingNumber: 'OFF-2026-0004' }),
        item({ id: 'b', status: 'DRAFT', trackingNumber: null }),
        item({ id: 'c', status: 'ENDORSED', trackingNumber: 'OFF-2026-0003' }),
        item({ id: 'd', status: 'RETURNED_BY_APPROVER', trackingNumber: 'OFF-2026-0002' }),
        item({ id: 'e', status: 'SUBMITTED', trackingNumber: 'OFF-2026-0001' }),
      ],
      'status',
      'asc',
    );

    expect(rows.map((row) => row.status)).toEqual([
      'DRAFT',
      'SUBMITTED',
      'RETURNED_BY_APPROVER',
      'ENDORSED',
      'APPROVED',
    ]);
  });

  it('sorts tracking numbers and activity dates', () => {
    const tracking = sortReportItems(
      [
        item({ trackingNumber: 'EDU-2026-0010' }),
        item({ trackingNumber: 'OFF-2026-0002' }),
        item({ trackingNumber: null }),
      ],
      'trackingNumber',
      'asc',
    );

    expect(tracking.map((row) => row.trackingNumber)).toEqual([
      null,
      'EDU-2026-0010',
      'OFF-2026-0002',
    ]);

    const activity = sortReportItems(
      [
        item({ id: 'late', activityStartDate: '2026-04-02' }),
        item({ id: 'early', activityStartDate: '2026-03-12' }),
      ],
      'activityDate',
      'asc',
    );

    expect(activity.map((row) => row.id)).toEqual(['early', 'late']);
  });

  it('defaults to updated descending and reverses on demand', () => {
    const rows = [
      item({ id: 'older', updatedAt: '2026-03-10T00:00:00.000Z' }),
      item({ id: 'newer', updatedAt: '2026-03-15T00:00:00.000Z' }),
    ];

    expect(sortReportItems(rows, 'updated', 'desc').map((row) => row.id)).toEqual([
      'newer',
      'older',
    ]);
    expect(sortReportItems(rows, 'updated', 'asc').map((row) => row.id)).toEqual([
      'older',
      'newer',
    ]);
  });

  it('toggles the active header and starts a new one ascending', () => {
    expect(toggledSort(DEFAULT_REPORT_FILTERS, 'status')).toEqual({ sort: 'status', dir: 'asc' });
    expect(
      toggledSort({ ...DEFAULT_REPORT_FILTERS, sort: 'status', dir: 'asc' }, 'status'),
    ).toEqual({ sort: 'status', dir: 'desc' });
    expect(sortDirectionFor(DEFAULT_REPORT_FILTERS, 'updated')).toBe('descending');
    expect(sortDirectionFor(DEFAULT_REPORT_FILTERS, 'status')).toBe('none');
  });
});

describe('rows', () => {
  it('opens drafts in the editor and everything else in the facsimile', () => {
    expect(rowHref('r1', 'DRAFT')).toBe('/reports/r1/edit');
    expect(rowHref('r1', 'RETURNED_BY_REVIEWER')).toBe('/reports/r1');
    expect(rowHref('r1', 'APPROVED')).toBe('/reports/r1');
  });

  it('builds the table row with the official labels and timestamps', () => {
    const row = reportRowFromItem(item({ updatedAt: '2026-03-13T00:00:00.000Z' }), {
      role: 'SUBMITTER',
      userId: 'u1',
      now: NOW,
    });

    expect(row).toMatchObject({
      href: '/reports/r1',
      typeLabel: 'Off-campus',
      activityDate: '12 Mar 2026',
      updatedRelative: '3 days ago',
      pendingSync: false,
    });
    expect(row.updatedExact).toContain('13 March 2026');
  });

  it('renders an activity range inside one month', () => {
    const row = reportRowFromItem(
      item({ activityStartDate: '2026-03-12', activityEndDate: '2026-03-13' }),
      { role: 'SUBMITTER', userId: 'u1', now: NOW },
    );

    expect(row.activityDate).toBe('12–13 Mar 2026');
  });

  it('offers Edit only for drafts and returned reports owned by the submitter', () => {
    expect(rowActionsFor('SUBMITTER', 'u1', 'u1', 'SUBMITTED').edit.visible).toBe(false);
    expect(rowActionsFor('SUBMITTER', 'u1', 'u1', 'RETURNED_BY_APPROVER').edit.visible).toBe(true);
    expect(rowActionsFor('SUBMITTER', 'u2', 'u1', 'DRAFT').edit.visible).toBe(false);
  });

  it('offers Delete only for drafts, and disables it while sending', () => {
    expect(rowActionsFor('SUBMITTER', 'u1', 'u1', 'DRAFT').delete).toEqual({
      visible: true,
      enabled: true,
    });
    expect(rowActionsFor('SUBMITTER', 'u1', 'u1', 'RETURNED_BY_REVIEWER').delete.visible).toBe(
      false,
    );

    const sending = rowActionsFor('SUBMITTER', 'u1', 'u1', 'DRAFT', true).delete;
    expect(sending.enabled).toBe(false);
    expect(sending.reason).toBe('This draft is still being sent to the server.');
  });

  it('hides both actions for read-only roles', () => {
    for (const role of ['REVIEWER', 'APPROVER'] as const) {
      const actions = rowActionsFor(role, 'u1', 'u1', 'DRAFT');

      expect(actions.edit.visible).toBe(false);
      expect(actions.delete.visible).toBe(false);
    }
  });

  it('lets an admin edit and delete a draft it filed itself', () => {
    expect(rowActionsFor('ADMIN', 'u1', 'u1', 'DRAFT').edit.visible).toBe(true);
    expect(rowActionsFor('ADMIN', 'u1', 'u1', 'DRAFT').delete.visible).toBe(true);
    expect(rowActionsFor('ADMIN', 'u2', 'u1', 'DRAFT').edit.visible).toBe(false);
  });
});

describe('pending rows', () => {
  const options = { ownerUserId: 'u1', role: 'SUBMITTER' as const, now: NOW };

  it('shows a device draft only to a role that files reports', () => {
    for (const role of ['REVIEWER', 'APPROVER', null] as const) {
      expect(pendingRowsFromDrafts([draft()], { ...options, role })).toHaveLength(0);
    }
    expect(pendingRowsFromDrafts([draft()], { ...options, role: 'ADMIN' })).toHaveLength(1);
  });

  it('lists device-only drafts owned by the signed-in account', () => {
    const rows = pendingRowsFromDrafts(
      [
        draft(),
        draft({ id: 'other', ownerUserId: 'u2' }),
        draft({ id: 'legacy', ownerUserId: undefined }),
      ],
      options,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: 'd1',
      href: '/reports/d1/edit',
      trackingNumber: null,
      pendingSync: true,
      activityDate: '12–13 Mar 2026',
      title: 'Coastal cleanup',
    });
  });

  it('leaves a draft the server already knows to the server list', () => {
    const rows = pendingRowsFromDrafts(
      [draft(), draft({ id: 'd2', serverId: 'd2', updatedAt: '2026-03-16T00:00:00.000Z' })],
      options,
    );

    expect(rows.map((row) => row.id)).toEqual(['d1']);
  });

  it('sorts pending rows newest first and names an untitled draft', () => {
    const rows = pendingRowsFromDrafts(
      [
        draft({ id: 'old', updatedAt: '2026-03-10T00:00:00.000Z' }),
        draft({
          id: 'new',
          updatedAt: '2026-03-15T00:00:00.000Z',
          form: { ...draft().form, title: '   ' },
        }),
      ],
      options,
    );

    expect(rows.map((row) => row.id)).toEqual(['new', 'old']);
    expect(rows[0].title).toBe('Untitled draft');
  });

  it('keeps device-only drafts in the All and Drafts tabs only', () => {
    for (const [tab, expected] of [
      ['all', 1],
      ['drafts', 1],
      ['returned', 0],
      ['approved', 0],
    ] as const) {
      const rows = pendingRowsFromDrafts([draft()], { ...options, scope: { tab } });
      expect(rows).toHaveLength(expected);
    }
  });

  it('applies the same search, type, campus, and date filters as the table', () => {
    const scoped = (scope: Partial<PendingRowScope>) =>
      pendingRowsFromDrafts([draft()], { ...options, scope });

    expect(scoped({ q: 'coastal' })).toHaveLength(1);
    expect(scoped({ q: 'marine' })).toHaveLength(0);
    expect(scoped({ type: 'IN_CAMPUS' })).toHaveLength(1);
    expect(scoped({ type: 'OFF_CAMPUS' })).toHaveLength(0);
    expect(scoped({ campusId: 'c1' })).toHaveLength(1);
    expect(scoped({ campusId: 'c2' })).toHaveLength(0);
    expect(scoped({ from: '2026-03-01', to: '2026-03-31' })).toHaveLength(1);
    expect(scoped({ from: '2026-04-01' })).toHaveLength(0);
    expect(scoped({ termId: 't1' })).toHaveLength(0);
    expect(scoped({ page: 2 })).toHaveLength(0);
  });
});
