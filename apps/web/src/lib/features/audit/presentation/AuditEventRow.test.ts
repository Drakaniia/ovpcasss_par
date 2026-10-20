import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import type { AuditEventDetail as AuditEventDetailType, AuditEventItem } from '@par/shared';
import AuditEventRow from './AuditEventRow.svelte';

const EVENT: AuditEventItem = {
  id: 'aud_123',
  actorName: 'M. Santos',
  actorRole: 'REVIEWER',
  action: 'ENDORSED',
  entityType: 'report',
  entityId: 'rep_1',
  entityLabel: 'OFF-2026-0014',
  fromStatus: 'SUBMITTED',
  toStatus: 'ENDORSED',
  comment: 'Recommended for approval',
  ip: '192.168.1.50',
  userAgent: 'Mozilla/5.0',
  createdAt: '2026-10-17T06:02:00.000Z',
};

const DETAIL: AuditEventDetailType = {
  ...EVENT,
  before: { title: 'Old Title' },
  after: { title: 'New Title' },
};

function renderRow(
  props: {
    event?: AuditEventItem;
    expanded?: boolean;
    detail?: AuditEventDetailType | null;
    loadingDetail?: boolean;
    detailError?: string | null;
    ontoggle?: () => void;
    onretrydetail?: () => void;
  } = {},
) {
  return render(AuditEventRow, {
    props: {
      event: props.event ?? EVENT,
      expanded: props.expanded ?? false,
      detail: props.detail !== undefined ? props.detail : DETAIL,
      loadingDetail: props.loadingDetail ?? false,
      detailError: props.detailError ?? null,
      ontoggle: props.ontoggle ?? (() => {}),
      onretrydetail: props.onretrydetail ?? (() => {}),
    },
  });
}

describe('AuditEventRow', () => {
  it('renders line 1 and line 2 in 56 px row', () => {
    const { body } = renderRow();

    // Line 1
    expect(body).toContain('17 Oct 2026 14:02');
    expect(body).toContain('title="2026-10-17T06:02:00.000Z"');
    expect(body).toContain('M. Santos (Reviewer)');
    expect(body).toContain('Endorsed');
    expect(body).toContain('report');
    expect(body).toContain('OFF-2026-0014');

    // Line 2
    expect(body).toContain('Submitted → Endorsed');
    expect(body).toContain('Recommended for approval');

    // Collapsed state
    expect(body).toContain('aria-expanded="false"');
  });

  it('renders inline detail when expanded is true', () => {
    const { body } = renderRow({ expanded: true });

    expect(body).toContain('aria-expanded="true"');
    expect(body).toContain('Changes');
    expect(body).toContain('M. Santos (Reviewer) endorsed OFF-2026-0014 on 17 Oct 2026 at 14:02.');
  });
});
