import type { InboxItem, InboxResponse, InboxSection, Role } from '@par/shared';
import { describe, expect, it } from 'vitest';

import {
  adminActionsFor,
  auditActivityRows,
  checklistFor,
  completedStepCount,
  hasInboxContent,
  inboxSectionsFor,
  queueRows,
  reportActivityRows,
  returnedRows,
  waitingRows,
} from './inbox-view';

const NOW = new Date('2026-03-20T10:00:00Z');

const emptySection = (): InboxSection => ({ total: 0, items: [] });

const item = (overrides: Partial<InboxItem> = {}): InboxItem => ({
  id: 'report-1',
  trackingNumber: 'OFF-2026-0014',
  title: 'Coastal cleanup',
  type: 'OFF_CAMPUS',
  status: 'SUBMITTED',
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
  returned: emptySection(),
  review: emptySection(),
  approval: emptySection(),
  drafts: emptySection(),
  waiting: emptySection(),
  activity: [],
  admin: null,
  onboarding: { profileComplete: false, hasSubmitted: false, draftId: null },
  ...overrides,
});

const allSections = () =>
  inbox({
    returned: section(),
    review: section(),
    approval: section(),
    drafts: section(),
    waiting: section(),
    activity: [
      {
        id: 'event-1',
        reportId: 'report-1',
        trackingNumber: 'OFF-2026-0014',
        title: 'Coastal cleanup',
        kind: 'SUBMITTED',
        occurredAt: '2026-03-20T08:00:00Z',
      },
    ],
    admin: { failedEmails: 1, auditEvents: [] },
  });

describe('inboxSectionsFor', () => {
  it('keeps the fixed order for a person with every capability', () => {
    const roles: Role[] = ['SUBMITTER', 'REVIEWER', 'APPROVER', 'ADMIN'];
    expect(inboxSectionsFor(roles, allSections())).toEqual([
      'returned',
      'review',
      'approval',
      'admin',
      'drafts',
      'waiting',
      'activity',
    ]);
  });

  it('omits every empty section instead of rendering a zero', () => {
    const roles: Role[] = ['SUBMITTER'];
    expect(inboxSectionsFor(roles, inbox())).toEqual([]);
    expect(hasInboxContent(roles, inbox())).toBe(false);
  });

  it('shows a submitter only their own work', () => {
    const roles: Role[] = ['SUBMITTER'];
    const data = inbox({ returned: section(), drafts: section(), waiting: section() });

    expect(inboxSectionsFor(roles, data)).toEqual(['returned', 'drafts', 'waiting']);
  });

  it('filters queues by role even when the payload carries rows', () => {
    const roles: Role[] = ['SUBMITTER'];
    const data = inbox({ review: section(), approval: section() });

    expect(inboxSectionsFor(roles, data)).toEqual([]);
  });

  it('gives an admin its own block and the queues it can act on', () => {
    const roles: Role[] = ['ADMIN'];
    const data = inbox({
      review: section(),
      approval: section(),
      admin: { failedEmails: 1, auditEvents: [] },
    });

    expect(inboxSectionsFor(roles, data)).toEqual(['review', 'approval', 'admin']);
  });

  it('shows only recent audit activity when nothing else needs an admin', () => {
    const roles: Role[] = ['ADMIN'];
    const data = inbox({
      admin: {
        failedEmails: 0,
        auditEvents: [{ id: 'audit-1', summary: 'Role assigned', occurredAt: NOW.toISOString() }],
      },
    });

    expect(inboxSectionsFor(roles, data)).toEqual(['activity']);
  });
});

describe('row mapping', () => {
  it('opens returned reports on the edit page', () => {
    const [row] = returnedRows([item({ status: 'RETURNED_BY_REVIEWER' })], NOW);

    expect(row).toMatchObject({
      href: '/reports/report-1/edit',
      trackingNumber: 'OFF-2026-0014',
      meta: 'Returned by reviewer · 2 days ago',
    });
  });

  it('opens queue rows on the matching detail route', () => {
    expect(queueRows([item()], 'review', NOW)[0]?.href).toBe('/review/report-1');
    expect(queueRows([item()], 'approval', NOW)[0]?.href).toBe('/approval/report-1');
    expect(queueRows([item()], 'review', NOW)[0]?.meta).toBe('Submitted · 2 days');
  });

  it('uses the status next-step copy on waiting rows', () => {
    const [row] = waitingRows([item({ status: 'ENDORSED' })], NOW);

    expect(row?.href).toBe('/reports/report-1');
    expect(row?.meta).toBe('With approving officer · Next: approve · 2 days');
  });

  it('phrases report activity from the API status and caps the list', () => {
    const events = Array.from({ length: 7 }, (_, index) => ({
      id: `event-${index}`,
      reportId: 'report-1',
      trackingNumber: 'OFF-2026-0014',
      title: 'Coastal cleanup',
      kind: 'SUBMITTED' as const,
      occurredAt: '2026-03-20T08:00:00Z',
    }));

    const rows = reportActivityRows(events, NOW);
    expect(rows).toHaveLength(5);
    expect(rows[0]).toMatchObject({
      prefix: 'Your report',
      label: 'OFF-2026-0014',
      suffix: 'was submitted',
      href: '/reports/report-1',
    });
  });

  it('links admin audit events to the audit log', () => {
    const [row] = auditActivityRows(
      [{ id: 'audit-1', summary: 'Role assigned to J. Dela Cruz', occurredAt: NOW.toISOString() }],
      NOW,
    );

    expect(row).toMatchObject({
      href: '/admin/audit',
      label: 'Role assigned to J. Dela Cruz',
    });
  });
});

describe('adminActionsFor', () => {
  it('omits the zero-count card', () => {
    expect(adminActionsFor({ failedEmails: 2, auditEvents: [] }).map((action) => action.id)).toEqual(
      ['failed-emails'],
    );

    expect(adminActionsFor({ failedEmails: 0, auditEvents: [] })).toEqual([]);
  });
});

describe('checklistFor', () => {
  it('starts with three incomplete steps', () => {
    const steps = checklistFor({ profileComplete: false, hasSubmitted: false, draftId: null });

    expect(completedStepCount(steps)).toBe(0);
    expect(steps.map((step) => step.title)).toEqual([
      'Complete your profile',
      'Create your first report',
      'Submit it for review',
    ]);
  });

  it('completes step 2 for a draft and links back to it', () => {
    const steps = checklistFor({ profileComplete: true, hasSubmitted: false, draftId: 'draft-9' });

    expect(completedStepCount(steps)).toBe(2);
    expect(steps[1]?.complete).toBe(true);
    expect(steps[1]?.href).toBe('/reports/draft-9/edit');
    expect(steps[2]?.complete).toBe(false);
  });

  it('completes all three after a submission', () => {
    const steps = checklistFor({ profileComplete: true, hasSubmitted: true, draftId: null });

    expect(completedStepCount(steps)).toBe(3);
  });
});
