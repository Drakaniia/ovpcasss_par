import type { InboxItem, InboxResponse, InboxSection, Role } from '@par/shared';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import InboxSkeleton from './InboxSkeleton.svelte';
import WorkInbox from './WorkInbox.svelte';

const NOW = new Date('2026-03-20T10:00:00Z');

const empty = (): InboxSection => ({ total: 0, items: [] });

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
  returned: empty(),
  review: empty(),
  approval: empty(),
  drafts: empty(),
  waiting: empty(),
  activity: [],
  admin: null,
  onboarding: { profileComplete: false, hasSubmitted: false, draftId: null },
  ...overrides,
});

const renderInbox = (data: InboxResponse, roles: Role[]) =>
  render(WorkInbox, { props: { inbox: data, roles, now: NOW } }).body;

const submitterInbox = () =>
  inbox({
    returned: section({
      total: 2,
      items: [
        item({ status: 'RETURNED_BY_REVIEWER' }),
        item({ id: 'report-2', trackingNumber: 'INC-2026-0009', title: 'Outreach program' }),
      ],
    }),
    drafts: section({
      total: 3,
      items: [item({ id: 'draft-1', trackingNumber: null, status: 'DRAFT', completeness: 62 })],
    }),
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
  });

describe('WorkInbox', () => {
  it('renders the submitter sections in the fixed order with the true count', () => {
    const html = renderInbox(submitterInbox(), ['SUBMITTER']);

    expect(html).toContain('Returned to you');
    expect(html).toContain('(2)');
    expect(html).toContain('Your drafts');
    expect(html).toContain('(3)');
    expect(html).toContain('62%');
    expect(html).toContain('Recent activity');

    expect(html.indexOf('Needs your action')).toBeLessThan(html.indexOf('Your drafts'));
    expect(html.indexOf('Your drafts')).toBeLessThan(html.indexOf('Waiting on the office'));
    expect(html.indexOf('Waiting on the office')).toBeLessThan(html.indexOf('Recent activity'));
  });

  it('links returned rows to edit and keeps decisions off the inbox', () => {
    const html = renderInbox(submitterInbox(), ['SUBMITTER']);

    expect(html).toContain('href="/reports/report-1/edit"');
    expect(html).not.toMatch(/>\s*(Endorse|Approve|Return)\s*</);
  });

  it('filters queues by role and omits every empty section', () => {
    const html = renderInbox(
      inbox({
        returned: section(),
        drafts: section(),
        review: section({ total: 4 }),
        activity: [],
      }),
      ['REVIEWER'],
    );

    expect(html).toContain('Awaiting your review');
    expect(html).toContain('(4)');
    expect(html).toContain('href="/review"');
    expect(html).not.toContain('Returned to you');
    expect(html).not.toContain('Your drafts');
    expect(html).not.toContain('(0)');
  });

  it('gives an admin its own block beside the queues it can act on', () => {
    const html = renderInbox(
      inbox({
        review: section({ total: 4 }),
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
      }),
      ['ADMIN'],
    );

    expect(html).toContain('Failed emails');
    expect(html).toContain('Recent audit activity');
    expect(html).toContain('Awaiting your review');
    expect(html).not.toContain('New report');
  });

  it('adds the stat row, the own-report chip, and the notifications digest', () => {
    const html = renderInbox(
      inbox({
        returned: section({
          total: 2,
          items: [item({ status: 'RETURNED_BY_REVIEWER', isOwn: true })],
        }),
        notificationsUnread: 3,
        recentlyDecided: [
          {
            id: 'e2',
            reportId: 'report-9',
            trackingNumber: 'INC-2026-0009',
            title: 'Outreach program',
            kind: 'ENDORSED',
            occurredAt: '2026-03-19T08:00:00Z',
          },
        ],
      }),
      ['ADMIN'],
    );

    expect(html).toContain('At a glance');
    expect(html).toContain('Returned to you');
    expect(html).toContain('3 unread notifications');
    expect(html).toContain('href="/notifications"');
    expect(html).toContain('Your report');
    expect(html).toContain('Recently decided by you');
  });

  it('renders no digest line at zero unread', () => {
    const html = renderInbox(submitterInbox(), ['SUBMITTER']);

    expect(html).not.toContain('unread notification');
    expect(html).not.toContain('href="/notifications"');
  });

  it('shows the onboarding checklist only when a submitter has nothing else', () => {
    const html = renderInbox(inbox(), ['SUBMITTER']);

    expect(html).toContain('Get started');
    expect(html).toContain('0 of 3 complete');
    expect(html).toContain('Complete your profile');
    expect(html).not.toContain('Needs your action');
  });

  it('uses a quiet empty panel for read-only roles, without a filled primary', () => {
    const html = renderInbox(inbox(), ['APPROVER']);

    expect(html).toContain('No reports are awaiting your approval');
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
