import type { RepositoryFacets } from '@par/shared';
import { describe, expect, it } from 'vitest';

import { activeChips, filterEcho, removedFilter } from './repository-chips';
import { DEFAULT_REPOSITORY_FILTERS } from './repository-filters';

const FACETS: RepositoryFacets = {
  campuses: [{ id: 'c1', label: 'Main campus', isActive: true }],
  colleges: [{ id: 'un1', label: 'College of Arts and Sciences', isActive: false }],
  terms: [{ id: 't1', label: '2nd Sem 2025-2026', isActive: true }],
  sdgs: [{ id: 's4', label: '4 Quality education', isActive: true }],
};

describe('active chips', () => {
  it('names the filters that are not already visible as controls', () => {
    const chips = activeChips(
      { ...DEFAULT_REPOSITORY_FILTERS, type: 'IN_CAMPUS', campusId: 'c1', status: 'ENDORSED' },
      FACETS,
    );

    expect(chips.map((chip) => chip.label)).toEqual(['Campus: Main campus']);
  });

  it('shows a deactivated reference value as an inactive chip instead of dropping it', () => {
    const chips = activeChips({ ...DEFAULT_REPOSITORY_FILTERS, collegeId: 'un1' }, FACETS);

    expect(chips[0]).toMatchObject({
      id: 'college',
      label: 'College: College of Arts and Sciences (inactive)',
      inactive: true,
    });
  });

  it('keeps a value the facets no longer carry, labelled with its raw id', () => {
    const chips = activeChips({ ...DEFAULT_REPOSITORY_FILTERS, campusId: 'gone' }, FACETS);

    expect(chips[0]).toMatchObject({ label: 'Campus: gone', inactive: true });
    expect(chips[0].title).toBe('This value is no longer in the reference data.');
  });

  it('summarises an SDG list, a date range, and free text in panel order', () => {
    const chips = activeChips(
      {
        ...DEFAULT_REPOSITORY_FILTERS,
        sdgIds: ['s4'],
        receivedFrom: '2026-03-01',
        receivedTo: '2026-03-31',
        pic: 'A. Cruz',
      },
      FACETS,
    );

    expect(chips.map((chip) => chip.label)).toEqual([
      'SDG: 4',
      'Received 01 Mar 2026 – 31 Mar 2026',
      'PIC: A. Cruz',
    ]);
  });

  it('removes one filter at a time', () => {
    expect(removedFilter('received')).toEqual({ receivedFrom: '', receivedTo: '' });
    expect(removedFilter('sdg')).toEqual({ sdgIds: [] });
    expect(removedFilter('campus')).toEqual({ campusId: '' });
  });
});

describe('scope echo', () => {
  it('echoes every active filter with the filter count', () => {
    const echo = filterEcho(
      { ...DEFAULT_REPOSITORY_FILTERS, type: 'OFF_CAMPUS', status: 'ENDORSED', campusId: 'c1' },
      FACETS,
    );

    expect(echo).toBe('Type: Off-campus · Status: Endorsed · Campus: Main campus · 3 filters');
  });

  it('stays silent when only the approved default applies', () => {
    expect(filterEcho(DEFAULT_REPOSITORY_FILTERS, FACETS)).toBe('');
  });

  it('names the search term when there are no filters', () => {
    expect(filterEcho({ ...DEFAULT_REPOSITORY_FILTERS, q: 'cleanup' }, FACETS)).toBe(
      'Search: cleanup',
    );
  });
});
