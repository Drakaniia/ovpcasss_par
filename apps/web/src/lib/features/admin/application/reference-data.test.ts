import type { Campus, Department, ReferenceEntityKey, Sdg, Term } from '@par/shared';
import { describe, expect, it } from 'vitest';

import {
  configFor,
  deactivationFor,
  draftForCreate,
  draftFromRow,
  drawerTitle,
  entityFromParams,
  findDuplicate,
  paramsForView,
  referenceDataHref,
  rowsFromEntries,
  savedMessage,
  showInactiveFromParams,
  validateDraft,
  visibleRows,
} from './reference-data';

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

const department = (overrides: Partial<Department> = {}): Department => ({
  id: 'd1',
  name: 'Registrar',
  sortOrder: 2,
  isActive: true,
  isSeeded: false,
  usageCount: 4,
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
  openReportCount: 3,
  ...overrides,
});

const sdg = (overrides: Partial<Sdg> = {}): Sdg => ({
  id: 's1',
  number: 4,
  title: 'Quality education',
  isActive: true,
  isSeeded: false,
  ...overrides,
});

describe('entity definitions', () => {
  const expectedFields: Record<ReferenceEntityKey, string[]> = {
    campuses: ['Code', 'Name', 'Sort order', 'Active'],
    units: ['Code', 'Name', 'Kind', 'Campus', 'Sort order', 'Active'],
    programs: ['Code', 'Name', 'Level', 'Unit', 'Sort order', 'Active'],
    departments: ['Name', 'Sort order', 'Active'],
    offices: ['Name', 'Sort order', 'Active'],
    sdgs: ['Number', 'Title', 'Active'],
    terms: ['School year', 'Semester', 'Start date', 'End date', 'Active'],
    'attachment-requirements': ['Activity type', 'Label', 'Minimum count', 'Required', 'Active'],
  };

  const expectedColumns: Record<ReferenceEntityKey, string[]> = {
    campuses: ['Code', 'Name', 'Order', 'Status'],
    units: ['Code', 'Name', 'Kind', 'Campus', 'Order', 'Status'],
    programs: ['Code', 'Name', 'Level', 'Unit', 'Order', 'Status'],
    departments: ['Name', 'Order', 'Status'],
    offices: ['Name', 'Order', 'Status'],
    sdgs: ['No.', 'Title', 'Status'],
    terms: ['School year', 'Semester', 'Start', 'End', 'Status'],
    'attachment-requirements': ['Activity type', 'Label', 'Min count', 'Required', 'Status'],
  };

  it.each(Object.keys(expectedFields) as ReferenceEntityKey[])(
    'defines the spec drawer fields and table columns for %s',
    (key) => {
      const config = configFor(key);
      expect(config.fields.map((field) => field.label)).toEqual(expectedFields[key]);
      expect(config.columns([]).map((column) => column.label)).toEqual(expectedColumns[key]);
    },
  );

  it('offers optional count columns only when the API supplies them', () => {
    expect(
      configFor('campuses')
        .columns(rowsFromEntries(configFor('campuses'), [campus()]))
        .map((c) => c.label),
    ).toContain('Units');
    expect(
      configFor('departments')
        .columns(rowsFromEntries(configFor('departments'), [department()]))
        .map((c) => c.label),
    ).toContain('Usage');
  });

  it('notes that attachment requirement changes apply to new submissions only', () => {
    expect(configFor('attachment-requirements').note?.({})).toBe(
      'Changes apply to new submissions only. Existing reports keep their requirements.',
    );
  });
});

describe('URL state', () => {
  it('defaults to campuses', () => {
    expect(entityFromParams(new URLSearchParams())).toBe('campuses');
    expect(showInactiveFromParams(new URLSearchParams())).toBe(false);
  });

  it('restores a shared view', () => {
    const params = new URLSearchParams('entity=units&inactive=1');
    expect(entityFromParams(params)).toBe('units');
    expect(showInactiveFromParams(params)).toBe(true);
  });

  it('falls back on an unknown entity instead of inventing one', () => {
    expect(entityFromParams(new URLSearchParams('entity=teachers'))).toBe('campuses');
  });

  it('round-trips the tab and the inactive toggle', () => {
    const search = paramsForView('attachment-requirements', true);
    const params = new URLSearchParams(search);
    expect(entityFromParams(params)).toBe('attachment-requirements');
    expect(showInactiveFromParams(params)).toBe(true);
    expect(paramsForView('campuses', false)).toBe('');
  });

  it('builds a specific tab link without changing the default destination', () => {
    expect(referenceDataHref('terms')).toBe('/admin/reference-data?entity=terms');
    expect(referenceDataHref('campuses')).toBe('/admin/reference-data');
    expect(referenceDataHref('units', true)).toBe('/admin/reference-data?entity=units&inactive=1');
  });
});

describe('visibleRows', () => {
  const config = configFor('campuses');

  it('hides inactive entries unless the toggle is on', () => {
    const rows = rowsFromEntries(config, [
      campus(),
      campus({ id: 'c2', code: 'SAT', name: 'Satellite', sortOrder: 2, isActive: false }),
    ]);

    expect(visibleRows(config, rows, false).map((row) => row.id)).toEqual(['c1']);
    expect(visibleRows(config, rows, true)).toHaveLength(2);
  });

  it('sorts by sort order and then name', () => {
    const rows = rowsFromEntries(config, [
      campus({ id: 'c2', code: 'SAT', name: 'Alpha', sortOrder: 2 }),
      campus({ id: 'c3', code: 'BRA', name: 'Beta', sortOrder: 1 }),
      campus({ id: 'c4', code: 'GMA', name: 'Alpha', sortOrder: 1 }),
    ]);

    expect(visibleRows(config, rows, false).map((row) => row.id)).toEqual(['c4', 'c3', 'c2']);
  });

  it('sorts SDGs by number', () => {
    const rows = rowsFromEntries(configFor('sdgs'), [
      sdg({ id: 's2', number: 11 }),
      sdg({ id: 's1', number: 4 }),
    ]);

    expect(visibleRows(configFor('sdgs'), rows, false).map((row) => row.id)).toEqual(['s1', 's2']);
  });

  it('sorts terms newest school year first', () => {
    const rows = rowsFromEntries(configFor('terms'), [
      term({ id: 't1', schoolYear: '2024-2025' }),
      term({ id: 't2', schoolYear: '2026-2027' }),
    ]);

    expect(visibleRows(configFor('terms'), rows, false).map((row) => row.id)).toEqual(['t2', 't1']);
  });
});

describe('drafts and validation', () => {
  it('starts a new entry at the next sort order', () => {
    const rows = rowsFromEntries(configFor('campuses'), [
      campus({ id: 'c1', sortOrder: 3 }),
      campus({ id: 'c2', sortOrder: 7 }),
    ]);

    expect(draftForCreate(configFor('campuses'), rows).values.sortOrder).toBe(8);
  });

  it('offers the first unused SDG number', () => {
    const rows = rowsFromEntries(configFor('sdgs'), [
      sdg({ id: 's1', number: 1 }),
      sdg({ id: 's2', number: 2 }),
    ]);

    expect(draftForCreate(configFor('sdgs'), rows).values.number).toBe(3);
  });

  it('reports every missing required field', () => {
    const config = configFor('campuses');
    const { errors, input } = validateDraft(config, {
      code: '',
      name: '  ',
      sortOrder: '',
      isActive: true,
    });

    expect(errors.code).toBe('Enter code.');
    expect(errors.name).toBe('Enter name.');
    expect(errors.sortOrder).toBe('Enter a number.');
    expect(input).toBeNull();
  });

  it('normalizes codes to uppercase and trims names', () => {
    const config = configFor('campuses');
    const { errors, input } = validateDraft(config, {
      code: 'main',
      name: '  Main Campus  ',
      sortOrder: 1,
      isActive: true,
    });

    expect(errors).toEqual({});
    expect(input).toMatchObject({ code: 'MAIN', name: 'Main Campus' });
  });

  it('rejects a malformed code and a malformed school year', () => {
    const campusResult = validateDraft(configFor('campuses'), {
      code: 'MAIN CAMPUS',
      name: 'Main',
      sortOrder: 1,
      isActive: true,
    });
    expect(campusResult.errors.code).toBe('Use letters, numbers, and hyphens.');

    const termResult = validateDraft(configFor('terms'), {
      schoolYear: '2025',
      semester: 1,
      startsOn: '2025-08-01',
      endsOn: '2025-12-15',
      isActive: true,
    });
    expect(termResult.errors.schoolYear).toBe('Use the format 2025-2026.');
  });

  it('rejects an end date before the start date', () => {
    const result = validateDraft(configFor('terms'), {
      schoolYear: '2025-2026',
      semester: 2,
      startsOn: '2025-12-01',
      endsOn: '2025-11-01',
      isActive: true,
    });

    expect(result.errors.endsOn).toBe('The end date must be on or after the start date.');
  });

  it('accepts a summer term', () => {
    const result = validateDraft(configFor('terms'), {
      schoolYear: '2025-2026',
      semester: 'SUMMER',
      startsOn: '2026-04-01',
      endsOn: '2026-05-30',
      isActive: true,
    });

    expect(result.errors).toEqual({});
    expect(result.input).toMatchObject({ semester: 'SUMMER' });
  });

  it('names the entity in the drawer title and the save message', () => {
    const config = configFor('sdgs');
    expect(drawerTitle(config, draftForCreate(config, []))).toBe('Add SDG');
    expect(drawerTitle(config, draftFromRow(config, rowsFromEntries(config, [sdg()])[0]))).toBe(
      'Edit SDG',
    );
    expect(savedMessage(config)).toBe('SDG saved');
    expect(savedMessage(configFor('campuses'))).toBe('Campus saved');
  });
});

describe('duplicates', () => {
  const config = configFor('campuses');
  const rows = rowsFromEntries(config, [
    campus(),
    campus({ id: 'c2', code: 'SAT', name: 'Satellite' }),
  ]);

  it('warns on a duplicate code and names the existing entry', () => {
    const match = findDuplicate(config, rows, { code: 'main', name: 'New', sortOrder: 9 }, null);

    expect(match?.row.id).toBe('c1');
    expect(match?.message).toBe('A campus with the code “MAIN” already exists. Save anyway?');
  });

  it('warns on a duplicate name, ignoring case and padding', () => {
    const match = findDuplicate(
      config,
      rows,
      { code: 'NEW', name: '  satellite ', sortOrder: 9 },
      null,
    );

    expect(match?.message).toBe('A campus named “Satellite” already exists. Save anyway?');
  });

  it('does not warn about the row being edited', () => {
    const match = findDuplicate(
      config,
      rows,
      { code: 'MAIN', name: 'Main Campus', sortOrder: 1 },
      'c1',
    );
    expect(match).toBeNull();
  });

  it('checks SDG numbers', () => {
    const sdgRows = rowsFromEntries(configFor('sdgs'), [sdg()]);
    const match = findDuplicate(configFor('sdgs'), sdgRows, { number: 4, title: 'New' }, null);

    expect(match?.message).toBe('SDG 4 already exists. Save anyway?');
  });
});

describe('deactivation copy', () => {
  it('blocks deactivating the current term with an adjacent reason', () => {
    const rows = rowsFromEntries(configFor('terms'), [term()]);
    const copy = deactivationFor(configFor('terms'), rows[0]);

    expect(copy.blockedReason).toBe('Set another term current first.');
    expect(copy.title).toBe('Deactivate term “2025-2026 · 1st”?');
  });

  it('blocks a term used by open reports', () => {
    const rows = rowsFromEntries(configFor('terms'), [term({ isCurrent: false })]);
    expect(deactivationFor(configFor('terms'), rows[0]).blockedReason).toBe(
      'This term is used by open reports.',
    );
  });

  it('warns with the usage count and states the consequence', () => {
    const rows = rowsFromEntries(configFor('departments'), [department()]);
    const copy = deactivationFor(configFor('departments'), rows[0]);

    expect(copy.description).toContain('4 reports use this department.');
    expect(copy.description).toContain(
      'Deactivated entries stay in existing reports but no longer appear in new forms.',
    );
  });

  it('carries the consequence text even without a usage warning', () => {
    const rows = rowsFromEntries(configFor('campuses'), [campus({ unitsCount: null })]);
    const copy = deactivationFor(configFor('campuses'), rows[0]);

    expect(copy.description).toBe(
      'Deactivated entries stay in existing reports but no longer appear in new forms.',
    );
  });
});
