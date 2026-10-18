import type { Campus, Term } from '@par/shared';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import { configFor, draftForCreate, draftFromRow, rowsFromEntries } from '../application/reference-data';
import ReferenceDataTable from './ReferenceDataTable.svelte';
import ReferenceEntryDrawer from './ReferenceEntryDrawer.svelte';

const campus = (overrides: Partial<Campus> = {}): Campus => ({
  id: 'c1',
  code: 'MAIN',
  name: 'Main Campus',
  sortOrder: 1,
  isActive: true,
  isSeeded: true,
  unitsCount: 15,
  ...overrides,
});

const term = (overrides: Partial<Term> = {}): Term => ({
  id: 't1',
  schoolYear: '2025-2026',
  semester: 1,
  startsOn: '2025-08-01',
  endsOn: '2025-12-15',
  isCurrent: true,
  isActive: true,
  isSeeded: true,
  ...overrides,
});

const noop = () => {};

describe('ReferenceDataTable', () => {
  it('renders the entity columns, the seeded chip, and the row menu', () => {
    const config = configFor('campuses');
    const rows = rowsFromEntries(config, [campus()]);

    const html = render(ReferenceDataTable, {
      props: {
        config,
        rows,
        selectedId: null,
        onopen: noop,
        ondeactivate: noop,
        onactivate: noop,
      },
    }).body;

    expect(html).toContain('<th scope="col"');
    for (const label of ['Code', 'Name', 'Units', 'Order', 'Status']) {
      expect(html).toContain(label);
    }
    expect(html).toContain('Seeded');
    expect(html).toContain('Actions for Main Campus');
    expect(html).toContain('table-col-secondary');
  });

  it('labels inactive rows and marks the current term', () => {
    const config = configFor('terms');
    const rows = rowsFromEntries(config, [term(), term({ id: 't2', isCurrent: false })]);

    const html = render(ReferenceDataTable, {
      props: {
        config,
        rows,
        selectedId: null,
        onopen: noop,
        ondeactivate: noop,
        onactivate: noop,
      },
    }).body;

    expect(html).toContain('Current');
    expect(html).toContain('2025-2026');
  });
});

describe('ReferenceEntryDrawer', () => {
  it('names the entity, explains a seeded row, and offers soft removal', () => {
    const config = configFor('campuses');
    const rows = rowsFromEntries(config, [campus()]);

    const html = render(ReferenceEntryDrawer, {
      props: {
        config,
        draft: draftFromRow(config, rows[0]),
        rows,
        related: {},
        onclose: noop,
        onchanged: noop,
      },
    }).body;

    expect(html).toContain('Edit campus');
    expect(html).toContain('Seeded from the source workbook. Deactivate rather than delete.');
    expect(html).toContain('Save entry');
    expect(html).toContain('Deactivate');
    expect(html).not.toContain('Delete');
  });

  it('adds with the entity singular and defaults the sort order', () => {
    const config = configFor('campuses');
    const html = render(ReferenceEntryDrawer, {
      props: {
        config,
        draft: draftForCreate(config, rowsFromEntries(config, [campus({ sortOrder: 6 })])),
        rows: rowsFromEntries(config, [campus({ sortOrder: 6 })]),
        related: {},
        onclose: noop,
        onchanged: noop,
      },
    }).body;

    expect(html).toContain('Add campus');
    expect(html).toContain('value="7"');
  });

  it('blocks deactivating the current term with a visible reason', () => {
    const config = configFor('terms');
    const rows = rowsFromEntries(config, [term()]);

    const html = render(ReferenceEntryDrawer, {
      props: {
        config,
        draft: draftFromRow(config, rows[0]),
        rows,
        related: {},
        onclose: noop,
        onchanged: noop,
      },
    }).body;

    expect(html).toContain('Set another term current first.');
    expect(html).toContain('This term is current.');
  });
});
