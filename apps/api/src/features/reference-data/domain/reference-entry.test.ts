import type { ReferenceRowMap } from '@par/db';
import {
  REFERENCE_ENTITIES,
  attachmentRequirementSchema,
  campusSchema,
  departmentSchema,
  programSchema,
  sdgSchema,
  termSchema,
  unitSchema,
} from '@par/shared';
import { describe, expect, it } from 'vitest';

import {
  isReferenceEntityKey,
  toAttachmentRequirementEntry,
  toCampusEntry,
  toDirectoryEntry,
  toProgramEntry,
  toSdgEntry,
  toSemester,
  toStoredSemester,
  toTermEntry,
  toUnitEntry,
} from './reference-entry';

type CampusRow = ReferenceRowMap['campuses'];
type UnitRow = ReferenceRowMap['units'];
type ProgramRow = ReferenceRowMap['programs'];
type DirectoryRow = ReferenceRowMap['departments'];
type SdgRow = ReferenceRowMap['sdgs'];
type TermRow = ReferenceRowMap['terms'];
type AttachmentRow = ReferenceRowMap['attachment-requirements'];

const BOOKKEEPING = {
  isActive: true,
  isSeeded: true,
  deletedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
} as const;

const UPDATED_AT = '2026-01-02T00:00:00.000Z';

describe('semester conversion', () => {
  it('maps the stored strings to the contract form', () => {
    expect(toSemester('1')).toBe(1);
    expect(toSemester('2')).toBe(2);
    expect(toSemester('SUMMER')).toBe('SUMMER');
  });

  it('round-trips every semester back to its stored string', () => {
    for (const stored of ['1', '2', 'SUMMER'] as const) {
      expect(toStoredSemester(toSemester(stored))).toBe(stored);
    }
  });
});

describe('isReferenceEntityKey', () => {
  it('accepts every known key', () => {
    for (const key of REFERENCE_ENTITIES) expect(isReferenceEntityKey(key)).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isReferenceEntityKey('bogus')).toBe(false);
  });
});

describe('reference entry mapping', () => {
  it('maps a campus row and its unit count', () => {
    const row: CampusRow = { ...BOOKKEEPING, id: 'c1', code: 'MAIN', name: 'Main', sortOrder: 1 };

    const entry = toCampusEntry(row, 3);

    expect(entry).toEqual({
      id: 'c1',
      code: 'MAIN',
      name: 'Main',
      sortOrder: 1,
      unitsCount: 3,
      isActive: true,
      isSeeded: true,
      updatedAt: UPDATED_AT,
    });
    expect(campusSchema.parse(entry)).toEqual(entry);
  });

  it('maps zero units to a number, not null', () => {
    const row: CampusRow = { ...BOOKKEEPING, id: 'c1', code: 'MAIN', name: 'Main', sortOrder: 1 };
    expect(toCampusEntry(row, 0).unitsCount).toBe(0);
  });

  it('maps a unit row with its resolved campus name', () => {
    const row: UnitRow = {
      ...BOOKKEEPING,
      id: 'u1',
      code: 'CBA',
      name: 'Business',
      kind: 'COLLEGE',
      campusId: 'c1',
      sortOrder: 2,
    };

    const entry = toUnitEntry(row, 'Main');

    expect(entry).toEqual({
      id: 'u1',
      code: 'CBA',
      name: 'Business',
      kind: 'COLLEGE',
      campusId: 'c1',
      campusName: 'Main',
      sortOrder: 2,
      isActive: true,
      isSeeded: true,
      updatedAt: UPDATED_AT,
    });
    expect(unitSchema.parse(entry)).toEqual(entry);
  });

  it('maps a program row with its resolved unit name', () => {
    const row: ProgramRow = {
      ...BOOKKEEPING,
      id: 'p1',
      code: 'BSBA',
      name: 'Business Admin',
      level: 'UNDERGRADUATE',
      unitId: 'u1',
      sortOrder: 3,
    };

    const entry = toProgramEntry(row, 'Business');

    expect(entry).toEqual({
      id: 'p1',
      code: 'BSBA',
      name: 'Business Admin',
      level: 'UNDERGRADUATE',
      unitId: 'u1',
      unitName: 'Business',
      sortOrder: 3,
      isActive: true,
      isSeeded: true,
      updatedAt: UPDATED_AT,
    });
    expect(programSchema.parse(entry)).toEqual(entry);
  });

  it('maps a directory row without a usage count', () => {
    const row: DirectoryRow = { ...BOOKKEEPING, id: 'd1', name: 'Registrar', sortOrder: 4 };

    const entry = toDirectoryEntry(row);

    expect(entry).toEqual({
      id: 'd1',
      name: 'Registrar',
      sortOrder: 4,
      isActive: true,
      isSeeded: true,
      updatedAt: UPDATED_AT,
    });
    expect(entry).not.toHaveProperty('usageCount');
    expect(departmentSchema.parse(entry)).toEqual(entry);
  });

  it('maps an SDG row', () => {
    const row: SdgRow = { ...BOOKKEEPING, id: 's1', number: 4, title: 'Quality Education' };

    const entry = toSdgEntry(row);

    expect(entry).toEqual({
      id: 's1',
      number: 4,
      title: 'Quality Education',
      isActive: true,
      isSeeded: true,
      updatedAt: UPDATED_AT,
    });
    expect(sdgSchema.parse(entry)).toEqual(entry);
  });

  it('maps a term row and converts the semester, omitting the open report count', () => {
    const row: TermRow = {
      ...BOOKKEEPING,
      id: 't1',
      schoolYear: '2025-2026',
      semester: '1',
      startsOn: '2025-08-01',
      endsOn: '2025-12-15',
      isCurrent: true,
    };

    const entry = toTermEntry(row);

    expect(entry).toEqual({
      id: 't1',
      schoolYear: '2025-2026',
      semester: 1,
      startsOn: '2025-08-01',
      endsOn: '2025-12-15',
      isCurrent: true,
      isActive: true,
      isSeeded: true,
      updatedAt: UPDATED_AT,
    });
    expect(entry).not.toHaveProperty('openReportCount');
    expect(termSchema.parse(entry)).toEqual(entry);
  });

  it('maps an attachment requirement row', () => {
    const row: AttachmentRow = {
      ...BOOKKEEPING,
      id: 'a1',
      activityType: 'OFF_CAMPUS',
      label: 'Attendance sheet',
      minCount: 1,
      isRequired: true,
    };

    const entry = toAttachmentRequirementEntry(row);

    expect(entry).toEqual({
      id: 'a1',
      activityType: 'OFF_CAMPUS',
      label: 'Attendance sheet',
      minCount: 1,
      isRequired: true,
      isActive: true,
      isSeeded: true,
      updatedAt: UPDATED_AT,
    });
    expect(attachmentRequirementSchema.parse(entry)).toEqual(entry);
  });
});
