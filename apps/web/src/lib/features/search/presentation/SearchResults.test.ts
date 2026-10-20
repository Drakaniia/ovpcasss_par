import type { RepositoryItem } from '@par/shared';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import { DEFAULT_REPOSITORY_FILTERS } from '../application/repository-filters';
import { repositoryRowFromItem } from '../application/repository-rows';
import SearchResults from './SearchResults.svelte';

const item = (overrides: Partial<RepositoryItem> = {}): RepositoryItem => ({
  id: 'r1',
  ownerUserId: 'u1',
  trackingNumber: 'OFF-2026-0014',
  title: 'Coastal cleanup',
  type: 'OFF_CAMPUS',
  classification: 'CURRICULAR',
  level: 'UNDERGRADUATE',
  status: 'APPROVED',
  campusId: 'c1',
  collegeId: 'un1',
  college: 'College of Arts and Sciences',
  receivedAt: '2026-03-14T01:12:00.000Z',
  activityStartDate: '2026-03-12',
  activityEndDate: '2026-03-13',
  ...overrides,
});

function renderTable(query = '', overrides: Partial<RepositoryItem> = {}) {
  const rows = [repositoryRowFromItem(item(overrides), { query })];
  return render(SearchResults, {
    props: {
      rows,
      filters: DEFAULT_REPOSITORY_FILTERS,
      onsort: () => {},
      onselect: () => {},
    },
  });
}

describe('SearchResults', () => {
  it('shows the register columns and the row facts', () => {
    const { body } = renderTable();

    for (const heading of ['Received', 'Tracking no.', 'Title', 'Type', 'College', 'Status']) {
      expect(body).toContain(heading);
    }

    expect(body).toContain('14 Mar 2026');
    expect(body).toContain('OFF-2026-0014');
    expect(body).toContain('Coastal cleanup');
    expect(body).toContain('Off-campus');
    expect(body).toContain('College of Arts and Sciences');
    expect(body).toContain('status-badge');
  });

  it('makes the title the row link and defaults to received descending', () => {
    const { body } = renderTable();

    expect(body).toContain('href="/reports/r1"');
    expect(body).toContain('aria-sort="descending"');
    expect(body).toContain('aria-sort="none"');
  });

  it('marks the matched term inside the title', () => {
    const { body } = renderTable('clean');

    expect(body).toContain('<mark class="match');
    expect(body).toContain('>clean</mark>');
    // The rest of the title stays as text either side of the mark.
    expect(body).toContain('Coastal ');
    expect(body).toContain('up');
  });

  it('marks the narrative snippet when the API supplies one', () => {
    const { body } = renderTable('debris', {
      snippet: 'Pupils collected 40 sacks of debris.',
    });

    expect(body).toContain('>debris</mark>');
    expect(body).toContain('Pupils collected 40 sacks of ');
  });

  it('marks nothing when there is no query', () => {
    const { body } = renderTable();

    expect(body).not.toContain('<mark');
  });
});
