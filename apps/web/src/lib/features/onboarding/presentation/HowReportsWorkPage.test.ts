import { render } from 'svelte/server';
import { afterEach, describe, expect, it } from 'vitest';

import { session } from '$lib/session/session.svelte';

import HowReportsWorkPage from './HowReportsWorkPage.svelte';

function signIn(role: 'ADMIN' | 'PERSONNEL'): void {
  session.user = {
    id: 'user-1',
    fullName: 'Maria Santos',
    email: 'maria@example.test',
    role,
    status: 'ACTIVE',
    campusUnit: null,
    contactNumber: null,
  };
}

function renderPage(): string {
  return render(HowReportsWorkPage).body;
}

afterEach(() => {
  session.user = null;
});

describe('HowReportsWorkPage', () => {
  it('lists every stage as a tab and opens on the first', () => {
    const html = renderPage();

    expect(html).toContain('role="tablist"');
    expect((html.match(/role="tab"/g) ?? []).length).toBe(3);
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('id="stage-tab-prepare"');
  });

  it('explains the open stage with real status badges', () => {
    const html = renderPage();

    expect(html).toContain('role="tabpanel"');
    expect(html).toContain('aria-labelledby="stage-tab-prepare"');
    expect(html).toContain('Report status at this stage');
    expect(html).toContain('>Draft<');
  });

  it('gives the administrator the record-creation action', () => {
    signIn('ADMIN');
    const html = renderPage();

    expect((html.match(/btn-primary/g) ?? []).length).toBe(1);
    expect(html).toContain('href="/reports/new"');
  });

  it('sends the personnel in charge to their own records instead', () => {
    signIn('PERSONNEL');
    const html = renderPage();

    expect(html).not.toContain('href="/reports/new"');
    expect(html).toContain('href="/reports"');
  });
});
