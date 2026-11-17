import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import type { SessionUser } from '$lib/session/session.svelte';
import InboxPageHeader from './InboxPageHeader.svelte';

describe('report creation entry', () => {
  it.each(['ADMIN', 'PERSONNEL'] as const)('offers New record to %s', (role) => {
    const { body } = render(InboxPageHeader, {
      props: { user: { id: 'u1', fullName: 'Report Author', role } as SessionUser, roles: [role] },
    });
    expect(body).toContain('href="/reports/new"');
    expect(body).toContain('New record');
  });

  it('offers no creation action without an assigned role', () => {
    const { body } = render(InboxPageHeader, {
      props: { user: { id: 'u1', fullName: 'No Role' } as SessionUser, roles: [] },
    });
    expect(body).not.toContain('href="/reports/new"');
  });
});
