import type { InboxItem, InboxResponse, InboxSection, Role } from '@par/shared';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import InboxSkeleton from './InboxSkeleton.svelte';
import WorkInbox from './WorkInbox.svelte';

const NOW = new Date('2026-03-20T10:00:00Z');

const empty = (): InboxSection => ({ total: 0, items: [] });

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
  awaitingReview: empty(),
  withPic: empty(),
  returned: empty(),
  approved: empty(),
  myReports: empty(),
  activity: [],
  admin: null,
  onboarding: { profileComplete: false, hasSubmitted: false, draftId: null },
  ...overrides,
});

const renderInbox = (data: InboxResponse, roles: Role[]) =>
  render(WorkInbox, { props: { inbox: data, roles, now: NOW } }).body;

const personnelInbox = () =>
  inbox({
    returned: section({
      total: 2,
      items: [
        item({ status: 'RETURNED' }),
        item({ id: 'report-2', referenceNo: 'AR No. 0009', title: 'Outreach program' }),
      ],
    }),
    myReports: section({
      total: 3,
      items: [item({ id: 'report-3', status: 'DRAFT', submittedAt: null })],
    }),
    activity: [
      {
        id: 'event-1',
        reportId: 'report-1',
        referenceNo: 'AR No. 0014',
        title: 'Coastal cleanup',
        kind: 'SUBMITTED',
        occurredAt: '2026-03-20T08:00:00Z',
      },
    ],
  });

describe('WorkInbox', () => {
  it('renders a personnel account sections in the fixed order with the true count', () => {
    const html = renderInbox(personnelInbox(), ['PERSONNEL']);

    expect(html).toContain('AR No. 0014');
    expect(html).toContain('Returned for revision');
    expect(html).toContain('(2)');
    expect(html).toContain('Your assignments');
    expect(html).toContain('(3)');
    expect(html).toContain('Recent activity');

    expect(html.indexOf('Returned for revision')).toBeLessThan(
      html.indexOf('Your assignments'),
    );
    expect(html.indexOf('Your assignments')).toBeLessThan(html.indexOf('Recent activity'));
  });

  it('keeps decisions off the inbox and links rows to the record', () => {
    const html = renderInbox(personnelInbox(), ['PERSONNEL']);

    expect(html).toContain('href="/reports/report-1"');
    expect(html).not.toMatch(/>\s*(Endorse|Approve|Return)\s*</);
  });

  it('shows the office only the records it must act on', () => {
    const html = renderInbox(
      inbox({
        awaitingReview: section({ total: 4 }),
        withPic: section({ total: 2 }),
        myReports: section({ total: 9 }),
      }),
      ['ADMIN'],
    );

    expect(html).toContain('Awaiting your decision');
    expect(html).toContain('With personnel in charge');
    expect(html).toContain('(4)');
    expect(html).toContain('href="/reports?tab=submitted"');
    expect(html).not.toContain('Your assignments');
    expect(html).not.toContain('(0)');
  });

  it('marks an overdue record and offers a resend', () => {
    const html = renderInbox(
      inbox({
        withPic: section({
          total: 1,
          items: [item({ status: 'DRAFT', updatedAt: '2026-03-01T10:00:00Z' })],
        }),
      }),
      ['ADMIN'],
    );

    expect(html).toContain('Overdue');
    expect(html).toContain('Resend invitation for AR No. 0014');
  });

  it('adds the stat row, the notifications digest, and audit activity', () => {
    const html = renderInbox(
      inbox({
        awaitingReview: section({ total: 2 }),
        notificationsUnread: 3,
        admin: {
          failedEmails: 1,
          auditEvents: [
            {
              id: 'audit-1',
              summary: 'Role assigned to Maria Santos',
              occurredAt: NOW.toISOString(),
            },
          ],
        },
        recentlyDecided: [
          {
            id: 'e2',
            reportId: 'report-9',
            referenceNo: 'AR No. 0009',
            title: 'Outreach program',
            kind: 'APPROVED',
            occurredAt: '2026-03-19T08:00:00Z',
          },
        ],
      }),
      ['ADMIN'],
    );

    expect(html).toContain('At a glance');
    expect(html).toContain('3 unread notifications');
    expect(html).toContain('href="/notifications"');
    expect(html).toContain('Recently decided by you');
    expect(html).toContain('you approved');
    expect(html).toContain('Failed emails');
    expect(html).toContain('Recent audit activity');
  });

  it('renders no digest line at zero unread', () => {
    const html = renderInbox(personnelInbox(), ['PERSONNEL']);

    expect(html).not.toContain('unread notification');
    expect(html).not.toContain('href="/notifications"');
  });

  it('sends a personnel account with no assignments to the empty state', () => {
    const html = renderInbox(inbox(), ['PERSONNEL']);

    expect(html).toContain('No activities are assigned to you yet');
    expect(html).toContain('Complete your profile');
    expect(html).not.toContain('Awaiting your decision');
    expect(html).not.toContain('href="/reports/new"');
  });

  it('sends an empty office inbox to the shared records message', () => {
    const html = renderInbox(inbox(), ['ADMIN']);

    expect(html).toContain('Nothing needs your attention');
    expect(html).toContain('href="/reports/new"');
    expect(html).not.toContain('btn-primary');
  });

  it('tells a new personnel account no activity has been assigned yet', () => {
    const html = renderInbox(
      inbox({ onboarding: { profileComplete: false, hasSubmitted: true, draftId: null } }),
      ['PERSONNEL'],
    );

    expect(html).toContain('No activities are assigned to you yet');
  });
});

describe('InboxSkeleton', () => {
  it('announces loading and reserves real row heights', () => {
    const html = render(InboxSkeleton, { props: {} }).body;

    expect(html).toContain('Loading your work inbox');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('skeleton row');
  });

  it('can omit its own header when the real header is already rendered', () => {
    const html = render(InboxSkeleton, { props: { showHead: false } }).body;

    expect(html).not.toContain('height: 24px');
    expect(html).toContain('Loading your work inbox');
  });
});
