import { render } from 'svelte/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  url: new URL('http://localhost/reports?tab=returned'),
  role: 'ADMIN' as 'ADMIN' | 'PERSONNEL' | null,
  attention: { awaitingReview: 0, returned: 0, failedEmails: 0, loadedAt: 1 },
}));

vi.mock('$app/state', () => ({
  page: {
    get url() {
      return state.url;
    },
  },
}));
vi.mock('$lib/session/session.svelte', () => ({
  session: {
    get user() {
      return state.role ? { role: state.role } : null;
    },
  },
}));
vi.mock('$lib/session/inbox-attention.svelte', () => ({
  inboxAttention: state.attention,
  refreshInboxAttention: vi.fn(),
  clearInboxAttention: vi.fn(),
}));

import NavigationRow from './NavigationRow.svelte';

function tab(html: string, href: string): string {
  const marker = `href="${href}"`;
  const end = html.indexOf(marker);
  if (end < 0) return '';

  const start = html.lastIndexOf('<a', end);
  const close = html.indexOf('</a>', end);
  return html.slice(start, close + 4);
}

describe('NavigationRow attention dots', () => {
  beforeEach(() => {
    state.url = new URL('http://localhost/reports?tab=returned');
    state.role = 'ADMIN';
    Object.assign(state.attention, {
      awaitingReview: 0,
      returned: 0,
      failedEmails: 0,
      loadedAt: 1,
    });
  });

  it('marks a tab with work waiting and names the count for a screen reader', () => {
    state.attention.returned = 3;
    const { body } = render(NavigationRow, { props: {} });
    const returned = tab(body, '/reports?tab=returned');

    expect(returned).toContain('aria-label="Returned, 3 items need attention"');
    expect(body).toContain('tab-dot');
  });

  it('renders no dot, gap, or label when the count is zero', () => {
    const { body } = render(NavigationRow, { props: {} });
    const returned = tab(body, '/reports?tab=returned');

    expect(returned).not.toContain('aria-label');
    expect(body).not.toContain('tab-dot');
  });

  it('uses the warning tone for a failed email delivery', () => {
    state.url = new URL('http://localhost/admin/users');
    state.attention.failedEmails = 1;
    const { body } = render(NavigationRow, { props: {} });
    const emailLog = tab(body, '/admin/emails');

    expect(emailLog).toContain('aria-label="Email log, 1 item needs attention"');
    expect(emailLog).toContain('tab-dot');
    expect(emailLog).toContain('is-warning');
  });

  it('never shows the review count to personnel', () => {
    state.role = 'PERSONNEL';
    state.attention.awaitingReview = 5;
    const { body } = render(NavigationRow, { props: {} });

    expect(body).not.toContain('Submitted');
    expect(body).not.toContain('items need attention');
    expect(body).not.toContain('tab-dot');
  });
});
