import type { RepositoryFacets } from '@par/shared';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import { DEFAULT_REPOSITORY_FILTERS } from '../application/repository-filters';
import SearchFilters from './SearchFilters.svelte';

const FACETS: RepositoryFacets = {
  campuses: [{ id: 'c1', label: 'Main campus', isActive: true }],
  colleges: [{ id: 'un1', label: 'College of Arts and Sciences', isActive: true }],
  terms: [{ id: 't1', label: '2nd Sem 2025-2026', isActive: true }],
  sdgs: [{ id: 's4', label: '4 Quality education', isActive: true }],
};

function renderPanel(open = true) {
  return render(SearchFilters, {
    props: { filters: DEFAULT_REPOSITORY_FILTERS, facets: FACETS, open, onapply: () => {} },
  });
}

describe('SearchFilters', () => {
  it('carries every field from the spec, in the panel order', () => {
    const { body } = renderPanel();

    for (const label of [
      'Tracking number',
      'Title',
      'Type',
      'Classification',
      'Campus',
      'College or unit',
      'Term',
      'Department',
      'Office',
      'Level',
      'Status',
      'PIC name',
      'Date received',
      'Activity date',
    ]) {
      expect(body).toContain(label);
    }

    expect(body).toContain('Search 1–17');
    expect(body).toContain('4 Quality education');
  });

  it('offers no Draft status: drafts are not repository records', () => {
    const { body } = renderPanel();

    expect(body).not.toContain('Draft');
    expect(body).toContain('Approved');
    expect(body).toContain('Returned by approver');
  });

  it('starts collapsed or open according to the URL state', () => {
    expect(renderPanel(false).body).not.toContain('is-open');
    expect(renderPanel(true).body).toContain('is-open');
  });

  it('offers Apply and Reset without a second filled primary button', () => {
    const { body } = renderPanel();

    expect(body).toContain('Apply</button>');
    expect(body).toContain('Reset</button>');
    expect(body).not.toContain('btn-primary');
  });
});
