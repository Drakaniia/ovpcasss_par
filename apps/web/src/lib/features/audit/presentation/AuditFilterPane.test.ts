import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import { DEFAULT_AUDIT_FILTERS } from '../application/audit-filters';
import AuditFilterPane from './AuditFilterPane.svelte';

function renderPane(filters = DEFAULT_AUDIT_FILTERS) {
  return render(AuditFilterPane, {
    props: {
      filters,
      onapply: () => {},
      onreset: () => {},
    },
  });
}

describe('AuditFilterPane', () => {
  it('renders all filter controls from the spec', () => {
    const { body } = renderPane();

    expect(body).toContain('FILTERS');
    expect(body).toContain('Actor');
    expect(body).toContain('Action');
    expect(body).toContain('Entity type');
    expect(body).toContain('Entity ID');
    expect(body).toContain('Date range (Asia/Manila)');
    expect(body).toContain('Status change');
    expect(body).toContain('Apply</button>');
    expect(body).toContain('Reset</button>');
  });

  it('contains expected action options', () => {
    const { body } = renderPane();

    expect(body).toContain('All actions');
    expect(body).toContain('Registered');
    expect(body).toContain('Logged in');
    expect(body).toContain('Role changed');
    expect(body).toContain('Endorsed');
    expect(body).toContain('Approved');
  });

  it('contains expected entity type options', () => {
    const { body } = renderPane();

    expect(body).toContain('All entity types');
    expect(body).toContain('User');
    expect(body).toContain('Report');
    expect(body).toContain('Attachment');
    expect(body).toContain('Reference data');
    expect(body).toContain('Export');
    expect(body).toContain('Session');
  });

  it('labels each end of the date range visibly', () => {
    const { body } = renderPane();

    const labelFor = (id: string) =>
      body.match(new RegExp(`<label[^>]*for="${id}"[^>]*>[^<]*</label>`))?.[0] ?? '';

    expect(labelFor('filter-date-from')).toContain('From');
    expect(labelFor('filter-date-to')).toContain('To');
    // A screen-reader-only label leaves the two ends indistinguishable on screen.
    expect(labelFor('filter-date-from')).not.toContain('sr-only');
    expect(labelFor('filter-date-to')).not.toContain('sr-only');
  });

  it('shows inline error and disables apply when from date is after to date', () => {
    const { body } = renderPane({
      ...DEFAULT_AUDIT_FILTERS,
      from: '2026-10-20',
      to: '2026-10-15',
    });

    expect(body).toContain("The 'from' date cannot be after the 'to' date.");
    expect(body).toContain('disabled');
  });
});
