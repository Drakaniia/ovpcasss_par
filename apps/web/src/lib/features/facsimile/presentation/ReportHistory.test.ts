import type { ReportDetail, ReportHistoryEvent } from '@par/shared';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import ReportHistory from './ReportHistory.svelte';
import WorkflowStepper from './WorkflowStepper.svelte';

const events: ReportHistoryEvent[] = [
  {
    at: '2026-03-14T01:12:00.000Z',
    actorName: 'J. Dela Cruz',
    actorRole: 'SUBMITTER',
    action: 'Submitted',
    fromStatus: 'DRAFT',
    toStatus: 'SUBMITTED',
  },
  {
    at: '2026-03-15T02:40:00.000Z',
    actorName: 'M. Santos',
    actorRole: 'REVIEWER',
    action: 'Endorsed',
    fromStatus: 'SUBMITTED',
    toStatus: 'ENDORSED',
    comment: 'Endorsed for approval.',
  },
];

const detail = (overrides: Partial<ReportDetail> = {}): ReportDetail => ({
  id: 'r1',
  ownerUserId: 'u1',
  trackingNumber: 'OFF-2026-0014',
  status: 'ENDORSED',
  version: 3,
  updatedAt: '2026-03-15T02:40:00.000Z',
  form: {
    type: 'OFF_CAMPUS',
    classification: 'CURRICULAR',
    campusId: 'c1',
    unitId: 'un1',
    level: 'UNDERGRADUATE',
    title: 'Coastal cleanup',
    activityStartDate: '2026-03-12',
    activityEndDate: '2026-03-12',
    location: 'Brgy. Poblacion',
    totalStudents: 42,
    totalPic: 3,
    pics: [{ name: 'M. Santos' }],
    sdgIds: ['s14'],
    narrative: 'Summary.',
  },
  attachments: [],
  history: events,
  ...overrides,
});

describe('WorkflowStepper', () => {
  it('renders five stages with the reached stage current', () => {
    const html = render(WorkflowStepper, { props: { status: 'SUBMITTED' } }).body;

    for (const label of ['Draft', 'Submitted', 'Review', 'Endorsed', 'Approved']) {
      expect(html).toContain(label);
    }

    expect(html.match(/aria-current="step"/g)).toHaveLength(1);
    expect(html).toContain('completed');
  });

  it('keeps the reached stage and adds a Returned chip on a returned report', () => {
    const html = render(WorkflowStepper, { props: { status: 'RETURNED_BY_APPROVER' } }).body;

    expect(html).toContain('Returned');
    expect(html).toContain('href="#review-history"');
    expect(html).toContain('current stage');
  });

  it('adds a Resubmitted chip without a link', () => {
    const html = render(WorkflowStepper, { props: { status: 'RESUBMITTED' } }).body;

    expect(html).toContain('Resubmitted');
    expect(html).not.toContain('href="#review-history"');
  });
});

describe('ReportHistory', () => {
  it('groups events by day, ascending, and marks the latest Current', () => {
    const html = render(ReportHistory, { props: { detail: detail() } }).body;

    expect(html).toContain('14 Mar 2026');
    expect(html).toContain('15 Mar 2026');
    expect(html).toContain('Submitted');
    expect(html).toContain('Endorsed');
    expect(html).toContain('(Submitter)');
    expect(html).toContain('(Reviewer)');
    expect(html).toContain('Status: Draft');
    expect(html).toContain('Endorsed for approval.');
    expect(html.match(/Current/g)).toHaveLength(1);

    expect(html.indexOf('14 Mar 2026')).toBeLessThan(html.indexOf('15 Mar 2026'));
  });

  it('renders the stepper inside the history panel for narrow screens', () => {
    const html = render(ReportHistory, { props: { detail: detail() } }).body;

    expect(html).toContain('aria-label="Workflow progress"');
    expect(html).toContain('history-stepper');
  });

  it('says No events yet when the API has no timeline', () => {
    expect(render(ReportHistory, { props: { detail: detail({ history: [] }) } }).body).toContain(
      'No events yet.',
    );
  });
});
