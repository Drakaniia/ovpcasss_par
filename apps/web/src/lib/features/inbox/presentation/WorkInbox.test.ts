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
  activity: [],
  admin: null,
  ...overrides,
});

const renderInbox = (data: InboxResponse, roles: Role[]) =>
  render(WorkInbox, { props: { inbox: data, roles, now: NOW } }).body;

describe('WorkInbox', () => {
  it('shows the office only the records it must act on', () => {
    const html = renderInbox(
      inbox({
        awaitingReview: section({ total: 4 }),
        withPic: section({ total: 2 }),
      }),
      ['ADMIN'],
    );

    expect(html).toContain('Awaiting your decision');
    expect(html).toContain('With personnel in charge');
    expect(html).toContain('data-count="4"');
    expect(html).toContain('href="/reports?tab=submitted"');
    expect(html).not.toContain('Your assignments');
    expect(html).not.toContain('data-count="0"');
  });

  it('marks an overdue record and offers a resend', () => {
    const html = renderInbox(
      inbox({
        withPic: section({
          total: 1,
          items: [item({ status: 'PENDING', updatedAt: '2026-03-01T10:00:00Z' })],
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
    const html = renderInbox(inbox(), ['ADMIN']);

    expect(html).not.toContain('unread notification');
    expect(html).not.toContain('href="/notifications"');
  });

  it('leads with the work card and keeps the record of work in a rail', () => {
    const html = renderInbox(
      inbox({
        awaitingReview: section({ total: 2 }),
        withPic: section({ total: 1 }),
        activity: [
          {
            id: 'event-1',
            reportId: 'report-1',
            referenceNo: 'AR No. 0014',
            title: 'Coastal cleanup',
            kind: 'SUBMITTED',
            occurredAt: '2026-03-19T08:00:00Z',
          },
        ],
      }),
      ['ADMIN'],
    );

    expect(html).toMatch(/action-card[^"]* lead/);
    expect(html).toMatch(/class="rail[ "]/);
    expect(html.indexOf('Awaiting your decision')).toBeLessThan(
      html.indexOf('With personnel in charge'),
    );
  });

  it('gives each activity heading its own id', () => {
    const html = renderInbox(
      inbox({
        awaitingReview: section({ total: 1 }),
        activity: [
          {
            id: 'event-1',
            reportId: 'report-1',
            referenceNo: 'AR No. 0014',
            title: 'Coastal cleanup',
            kind: 'SUBMITTED',
            occurredAt: '2026-03-19T08:00:00Z',
          },
        ],
        recentlyDecided: [
          {
            id: 'event-2',
            reportId: 'report-9',
            referenceNo: 'AR No. 0009',
            title: 'Outreach program',
            kind: 'RETURNED',
            occurredAt: '2026-03-19T08:00:00Z',
          },
        ],
      }),
      ['ADMIN'],
    );

    expect(html).toContain('id="inbox-activity-recently-decided-by-you"');
    expect(html).toContain('id="inbox-activity-recent-activity"');
  });

  it('sends an empty office inbox to the shared records message', () => {
    const html = renderInbox(inbox(), ['ADMIN']);

    expect(html).toContain('Nothing needs your attention');
    expect(html).toContain('href="/reports/new"');
    expect(html).not.toContain('btn-primary');
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
