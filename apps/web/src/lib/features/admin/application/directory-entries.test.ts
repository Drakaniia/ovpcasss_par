import { describe, expect, it } from 'vitest';

import {
  nextDirectoryOrder,
  sortDirectory,
  upsertDirectoryEntry,
  withoutDirectoryEntry,
} from './directory-entries';

const entry = (id: string, name: string, sortOrder: number) => ({ id, name, sortOrder });

describe('directory ordering', () => {
  it('sorts by sort order, then by name', () => {
    const sorted = sortDirectory([
      entry('c', 'Registrar', 2),
      entry('a', 'Alumni Affairs', 1),
      entry('b', 'Cultural Affairs', 2),
    ]);

    expect(sorted.map((item) => item.name)).toEqual([
      'Alumni Affairs',
      'Cultural Affairs',
      'Registrar',
    ]);
  });

  it('does not mutate the list it was given', () => {
    const entries = [entry('a', 'Registrar', 2), entry('b', 'Alumni Affairs', 1)];
    sortDirectory(entries);

    expect(entries[0].name).toBe('Registrar');
  });

  it('places a new entry after the last one, and starts at 1', () => {
    expect(nextDirectoryOrder([])).toBe(1);
    expect(nextDirectoryOrder([entry('a', 'Registrar', 4), entry('b', 'Alumni Affairs', 2)])).toBe(
      5,
    );
  });
});

describe('directory membership', () => {
  it('adds an entry and replaces it in place by id', () => {
    const entries = [entry('a', 'Registrar', 1)];

    const added = upsertDirectoryEntry(entries, entry('b', 'Alumni Affairs', 2));
    expect(added.map((item) => item.id)).toEqual(['a', 'b']);

    const renamed = upsertDirectoryEntry(added, entry('b', 'Alumni Relations', 2));
    expect(renamed.map((item) => item.name)).toEqual(['Registrar', 'Alumni Relations']);
  });

  it('removes by id and leaves the rest alone', () => {
    const entries = [entry('a', 'Registrar', 1), entry('b', 'Alumni Affairs', 2)];

    expect(withoutDirectoryEntry(entries, 'a').map((item) => item.id)).toEqual(['b']);
    expect(withoutDirectoryEntry(entries, 'missing')).toHaveLength(2);
  });
});
