import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import type { AuditEventDetail as AuditEventDetailType, AuditEventItem } from '@par/shared';
import AuditEventDetail from './AuditEventDetail.svelte';

const BASE_EVENT: AuditEventItem = {
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
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  requestId: 'req_xyz789',
  createdAt: '2026-10-17T06:02:00.000Z',
};

const BASE_DETAIL: AuditEventDetailType = {
  ...BASE_EVENT,
  before: { title: 'Old Title', status: 'SUBMITTED' },
  after: { title: 'New Title', status: 'ENDORSED' },
};

function renderDetail(props: {
  event?: AuditEventItem;
  detail?: AuditEventDetailType | null;
  loading?: boolean;
  error?: string | null;
  onretry?: () => void;
} = {}) {
  return render(AuditEventDetail, {
    props: {
      event: props.event ?? BASE_EVENT,
      detail: props.detail !== undefined ? props.detail : BASE_DETAIL,
      loading: props.loading ?? false,
      error: props.error ?? null,
      onretry: props.onretry ?? (() => {}),
    },
  });
}

describe('AuditEventDetail', () => {
  it('renders summary, status change, diff table, context, and request info', () => {
    const { body } = renderDetail();

    expect(body).toContain('M. Santos (Reviewer) endorsed OFF-2026-0014 on 17 Oct 2026 at 14:02.');
    expect(body).toContain('Submitted → Endorsed');
    expect(body).toContain('title');
    expect(body).toContain('Old Title');
    expect(body).toContain('New Title');
    expect(body).toContain('192.168.1.50');
    expect(body).toContain('Mozilla/5.0');
    expect(body).toContain('req_xyz789');
    expect(body).toContain('Copy');
  });

  it('shows no field changes message when there are no diff entries', () => {
    const { body } = renderDetail({
      detail: {
        ...BASE_EVENT,
        action: 'LOGIN',
        before: null,
        after: null,
      },
    });

    expect(body).toContain('No field changes recorded.');
  });

  it('renders inline retry state on detail fetch failure', () => {
    const { body } = renderDetail({
      loading: false,
      error: 'Network connection failed',
      detail: null,
    });

    expect(body).toContain('Network connection failed');
    expect(body).toContain('Retry</button>');
  });
});
