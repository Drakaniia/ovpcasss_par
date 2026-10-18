import { render } from 'svelte/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('$app/state', () => ({
  page: { url: new URL('http://localhost/admin/reference-data') },
}));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

import ReferenceDataPage from './ReferenceDataPage.svelte';

describe('ReferenceDataPage', () => {
  it('renders the page title, all eight entity tabs in order, and one primary action', () => {
    const html = render(ReferenceDataPage, { props: {} }).body;

    expect(html).toContain('Reference data');

    const labels = [
      'Campuses',
      'Units &amp; colleges',
      'Programs',
      'Departments',
      'Offices',
      'SDGs',
      'Terms',
      'Attachment requirements',
    ];

    let previous = -1;
    for (const label of labels) {
      const index = html.indexOf(label);
      expect(index).toBeGreaterThan(previous);
      previous = index;
    }

    expect(html).toContain('aria-label="Reference data entities"');
    expect(html).toContain('Show inactive');
    expect(html).toContain('Add entry');
    expect(html.match(/btn-primary/g)).toHaveLength(1);
  });
});
