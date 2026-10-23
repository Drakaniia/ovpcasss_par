import type { RepositoryFacets } from '@par/shared';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import { activeChips } from '../application/repository-chips';
import { activeFilterCount } from '../application/repository-filter-scope';
import {
  DEFAULT_REPOSITORY_FILTERS,
  type RepositoryFilters,
} from '../application/repository-filters';
import SearchToolbar from './SearchToolbar.svelte';

const FACETS: RepositoryFacets = {
  campuses: [{ id: 'c1', label: 'Main campus', isActive: true }],
  colleges: [{ id: 'un1', label: 'College of Arts and Sciences', isActive: false }],
  terms: [{ id: 't1', label: '2nd Sem 2025-2026', isActive: true }],
  sdgs: [],
};

function renderToolbar(filters: Partial<RepositoryFilters> = {}) {
  const merged = { ...DEFAULT_REPOSITORY_FILTERS, ...filters };

  return render(SearchToolbar, {
    props: {
      filters: merged,
      facets: FACETS,
      chips: activeChips(merged, FACETS),
      filterCount: activeFilterCount(merged),
      panelOpen: false,
      onquery: () => {},
      onchange: () => {},
      onremove: () => {},
      onclear: () => {},
      ontogglepanel: () => {},
    },
  });
}

describe('SearchToolbar', () => {
  it('names the searchable fields in the placeholder', () => {
    const { body } = renderToolbar();

    expect(body).toContain('placeholder="Search title, narrative, PIC, location…"');
    expect(body).toContain('data-search-field');
  });

  it('keeps the three most-used filters visible and the panel toggle counted', () => {
    const { body } = renderToolbar();

    expect(body).toContain('Filters (0)');
    expect(body).toContain('All types');
    expect(body).toContain('All terms');
    expect(body).toContain('Approved');
    expect(body).not.toContain('Clear</button>');
  });

  it('counts the active filters and offers Clear', () => {
    const { body } = renderToolbar({ type: 'OFF_CAMPUS', status: 'SUBMITTED' });

    expect(body).toContain('Filters (2)');
    expect(body).toContain('Clear</button>');
  });

  it('renders a deactivated reference value as an inactive, removable chip', () => {
    const { body } = renderToolbar({ collegeId: 'un1' });

    expect(body).toContain('College: College of Arts and Sciences (inactive)');
    expect(body).toContain('Inactive');
    expect(body).toContain(
      'aria-label="Remove filter: College: College of Arts and Sciences (inactive)"',
    );
  });
});
