import { render } from 'svelte/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('$app/state', () => ({
  page: { url: new URL('http://localhost/admin/audit') },
}));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

import AdminAuditPage from './AdminAuditPage.svelte';

describe('AdminAuditPage', () => {
  it('renders page header, caveat, filter pane, and layout', () => {
    const { body } = render(AdminAuditPage, { props: {} });

    // Page Header & Caveat
    expect(body).toContain('Audit log');
    expect(body).toContain('Append-only record. Times are Asia/Manila.');

    // Filter controls
    expect(body).toContain('FILTERS');
    expect(body).toContain('Actor');
    expect(body).toContain('Action');
    expect(body).toContain('Apply</button>');
    expect(body).toContain('Reset</button>');
  });

  it('preserves exactly one filled navy primary button', () => {
    const { body } = render(AdminAuditPage, { props: {} });
    const matches = body.match(/btn-primary/g);
    expect(matches).not.toBeNull();
    expect(matches?.length).toBe(1);
  });
});
