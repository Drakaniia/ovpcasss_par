import type { QueueItem } from '@par/shared';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import { queueRowFromItem } from '../application/queue-rows';
import QueueTable from './QueueTable.svelte';

const NOW = new Date('2026-03-16T02:00:00.000Z');

const item = (overrides: Partial<QueueItem> = {}): QueueItem => ({
  id: 'r1',
  ownerUserId: 'u1',
  submitterName: 'M. Santos',
  trackingNumber: 'OFF-2026-0014',
  title: 'Coastal cleanup',
  type: 'OFF_CAMPUS',
  status: 'SUBMITTED',
  campusId: 'c1',
  collegeId: 'un1',
  college: 'College of Arts and Sciences',
  waitingSince: '2026-03-09T02:00:00.000Z',
  hasPendingAttachments: false,
  ...overrides,
});

describe('QueueTable', () => {
  it('shows the queue columns, the row facts, and the working-day age', () => {
    const rows = [queueRowFromItem(item(), { kind: 'review', now: NOW })];
    const { body } = render(QueueTable, { props: { rows, kind: 'review', onrow: () => {} } });

    for (const heading of ['Tracking no.', 'Title', 'Type', 'College', 'Submitted', 'Age']) {
      expect(body).toContain(heading);
    }

    expect(body).toContain('OFF-2026-0014');
    expect(body).toContain('Coastal cleanup');
    expect(body).toContain('Off-campus');
    expect(body).toContain('College of Arts and Sciences');
    expect(body).toContain('09 Mar 2026');
    // 9 March to 16 March is five working days: the warning is text, not color alone.
    expect(body).toContain('5 days — attention');
    expect(body).toContain('status-badge');
  });

  it('heads the waiting column with the endorsement date on the approval queue', () => {
    const rows = [queueRowFromItem(item({ status: 'ENDORSED' }), { kind: 'approval', now: NOW })];
    const { body } = render(QueueTable, { props: { rows, kind: 'approval', onrow: () => {} } });

    expect(body).toContain('Endorsed');
    expect(body).not.toContain('>Submitted<');
  });

  it('marks the selected row for assistive technology', () => {
    const rows = [queueRowFromItem(item(), { kind: 'review', now: NOW })];
    const { body } = render(QueueTable, {
      props: { rows, kind: 'review', selectedId: 'r1', onrow: () => {} },
    });

    expect(body).toContain('aria-selected="true"');
    expect(body).toContain('id="queue-row-r1"');
  });
});
