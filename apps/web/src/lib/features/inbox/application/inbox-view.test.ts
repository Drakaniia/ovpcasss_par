import type { InboxItem, InboxResponse, InboxSection, Role } from '@par/shared';
import { describe, expect, it } from 'vitest';

import {
  adminActionsFor,
  approvedRows,
  auditActivityRows,
  awaitingReviewRows,
  capabilitiesFor,
  hasInboxContent,
  inboxSectionsFor,
  inboxStatsFor,
  recentlyDecidedRows,
  reportActivityRows,
  returnedRows,
  withPicRows,
} from './inbox-view';

const NOW = new Date('2026-03-20T10:00:00Z');

const emptySection = (): InboxSection => ({ total: 0, items: [] });

const item = (overrides: Partial<InboxItem> = {}): InboxItem => ({
  id: 'report-1',
  referenceNo: 'AR No. 0014',
  title: 'Coastal cleanup',
  type: 'OFF_CAMPUS',
  status: 'SUBMITTED',
  activityStartDate: '2026-03-10',
  activityEndDate: '2026-03-11',
  location: 'Batangas',
  updatedAt: '2026-03-18T10:00:00Z',
  submittedAt: '2026-03-18T10:00:00Z',
  ...overrides,
});

const section = (overrides: Partial<InboxSection> = {}): InboxSection => ({
  total: 1,
  items: [item()],
  ...overrides,
});

const inbox = (overrides: Partial<InboxResponse> = {}): InboxResponse => ({
  awaitingReview: emptySection(),
  withPic: emptySection(),
  returned: emptySection(),
  approved: emptySection(),
  activity: [],
  admin: null,
  ...overrides,
});

const allSections = () =>
  inbox({
    awaitingReview: section(),
    withPic: section(),
    returned: section(),
    approved: section(),
  });

describe('capabilitiesFor', () => {
  it('separates the office from the personnel in charge', () => {
    expect(capabilitiesFor(['ADMIN'])).toEqual({ admin: true, personnel: false });
    expect(capabilitiesFor(['PERSONNEL'])).toEqual({ admin: false, personnel: true });
  });
});

describe('inboxSectionsFor', () => {
  it('keeps the fixed order for the office', () => {
    const roles: Role[] = ['ADMIN'];
    expect(inboxSectionsFor(roles, allSections())).toEqual([
      'awaitingReview',
      'withPic',
      'returned',
      'approved',
    ]);
  });

  it('never gives personnel the office queues', () => {
    const roles: Role[] = ['PERSONNEL'];
    expect(inboxSectionsFor(roles, allSections())).toEqual(['returned', 'approved']);
  });

  it('omits every empty section instead of rendering a zero', () => {
    const roles: Role[] = ['PERSONNEL'];
    expect(inboxSectionsFor(roles, inbox())).toEqual([]);
    expect(hasInboxContent(roles, inbox())).toBe(false);
  });

  it('ignores rows the role may not see even when the payload carries them', () => {
    const roles: Role[] = ['PERSONNEL'];
    const data = inbox({ awaitingReview: section(), withPic: section() });
    expect(inboxSectionsFor(roles, data)).toEqual([]);
  });
});

describe('inboxStatsFor', () => {
  it('never turns a zero into a tile', () => {
    expect(inboxStatsFor(['ADMIN'], inbox())).toEqual([]);
  });

  it('scopes the tiles to the office and links each to the register', () => {
    const data = inbox({ awaitingReview: section({ total: 4 }), withPic: section({ total: 2 }) });
    expect(inboxStatsFor(['ADMIN'], data)).toEqual([
      {
        id: 'awaitingReview',
        label: 'Awaiting your decision',
        count: 4,
        href: '/reports?tab=submitted',
      },
      {
        id: 'withPic',
        label: 'With personnel in charge',
        count: 2,
        href: '/reports?tab=pending',
      },
    ]);
  });

  it('counts a return for either role', () => {
    const data = inbox({ returned: section({ total: 1 }) });
    expect(inboxStatsFor(['PERSONNEL'], data)).toEqual([
      {
        id: 'returned',
        label: 'Returned for revision',
        count: 1,
        href: '/reports?tab=returned',
      },
    ]);
  });
});

describe('section rows', () => {
  it('reads a submission with its age and limits the preview to three rows', () => {
    const rows = awaitingReviewRows(
      section({
        total: 9,
        items: [
          item(),
          item({ id: 'report-2' }),
          item({ id: 'report-3' }),
          item({ id: 'report-4' }),
        ],
      }),
      NOW,
    );

    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      id: 'report-1',
      href: '/reports/report-1',
      referenceNo: 'AR No. 0014',
      meta: 'Submitted · 2 days ago',
      overdue: false,
    });
  });

  it('flags a record with its personnel in charge once seven days pass', () => {
    const [row] = withPicRows(
      section({ items: [item({ status: 'PENDING', submittedAt: null })] }),
      NOW,
    );
    expect(row.meta).toBe('Pending · 2 days');
    expect(row.overdue).toBe(false);

    const [stale] = withPicRows(
      section({
        items: [item({ status: 'PENDING', updatedAt: '2026-03-01T10:00:00Z' })],
      }),
      NOW,
    );
    expect(stale.overdue).toBe(true);
    expect(stale.canResend).toBe(true);
  });

  it('reads a returned record as the revision it needs', () => {
    const [row] = returnedRows(
      section({ items: [item({ status: 'RETURNED', updatedAt: '2026-03-20T08:00:00Z' })] }),
      NOW,
    );
    expect(row.meta).toBe('Revise and resubmit · 2 hours ago');
  });

  it('reads an approved record with when the narrative was submitted', () => {
    const [row] = approvedRows(
      section({ items: [item({ status: 'APPROVED', submittedAt: '2026-03-19T10:00:00Z' })] }),
      NOW,
    );
    expect(row.meta).toBe('Approved · yesterday');
  });
});

describe('adminActionsFor', () => {
  it('omits a zero-count card', () => {
    expect(adminActionsFor({ failedEmails: 0, auditEvents: [] })).toEqual([]);
  });

  it('keeps the failed-email card with its true count', () => {
    expect(adminActionsFor({ failedEmails: 3, auditEvents: [] })).toEqual([
      {
        id: 'failed-emails',
        title: 'Failed emails',
        count: 3,
        href: '/admin/emails',
        linkLabel: 'Open email log',
      },
    ]);
  });
});

describe('activity rows', () => {
  it('labels a report event with its AR No. and what happened', () => {
    const [row] = reportActivityRows(
      [
        {
          id: 'event-1',
          reportId: 'report-1',
          referenceNo: 'AR No. 0014',
          title: 'Coastal cleanup',
          kind: 'SUBMITTED',
          occurredAt: '2026-03-20T08:00:00Z',
        },
      ],
      NOW,
    );

    expect(row.label).toBe('AR No. 0014 — Coastal cleanup');
    expect(row.suffix).toBe('was submitted');
    expect(row.href).toBe('/reports/report-1');
    expect(row.relative).toBe('2 hours ago');
  });

  it('reads a decision as the action the reader took', () => {
    const [row] = recentlyDecidedRows(
      [
        {
          id: 'event-2',
          reportId: 'report-9',
          referenceNo: 'AR No. 0009',
          title: 'Outreach program',
          kind: 'RETURNED',
          occurredAt: '2026-03-19T08:00:00Z',
        },
      ],
      NOW,
    );

    expect(row.label).toBe('AR No. 0009');
    expect(row.suffix).toBe('you returned for revision');
  });

  it('sends an audit event to the audit log', () => {
    const [row] = auditActivityRows(
      [{ id: 'audit-1', summary: 'Role assigned to Maria Santos', occurredAt: NOW.toISOString() }],
      NOW,
    );
    expect(row.href).toBe('/admin/audit');
  });
});
