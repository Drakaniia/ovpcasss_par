import type { ReferenceRowMap } from '@par/db';
import {
  REFERENCE_ENTITIES,
  type AttachmentRequirement,
  type Campus,
  type Department,
  type Program,
  type ReferenceEntityKey,
  type Semester,
  type Sdg,
  type Term,
  type Unit,
} from '@par/shared';

type CampusRow = ReferenceRowMap['campuses'];
type UnitRow = ReferenceRowMap['units'];
type ProgramRow = ReferenceRowMap['programs'];
type DirectoryRow = ReferenceRowMap['departments'];
type SdgRow = ReferenceRowMap['sdgs'];
type TermRow = ReferenceRowMap['terms'];
type AttachmentRow = ReferenceRowMap['attachment-requirements'];

type StoredSemester = TermRow['semester'];

/** Terms store `'1'|'2'|'SUMMER'`; the contract shows `1 | 2 | 'SUMMER'` (spec §8). */
const SEMESTER_BY_STORED: Record<StoredSemester, Semester> = {
  '1': 1,
  '2': 2,
  SUMMER: 'SUMMER',
};

const STORED_BY_SEMESTER: Record<Semester, StoredSemester> = {
  1: '1',
  2: '2',
  SUMMER: 'SUMMER',
};

export function isReferenceEntityKey(value: string): value is ReferenceEntityKey {
  return (REFERENCE_ENTITIES as readonly string[]).includes(value);
}

export function toSemester(stored: StoredSemester): Semester {
  return SEMESTER_BY_STORED[stored];
}

export function toStoredSemester(semester: Semester): StoredSemester {
  return STORED_BY_SEMESTER[semester];
}

export function toCampusEntry(row: CampusRow, unitsCount: number): Campus {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    sortOrder: row.sortOrder,
    unitsCount,
    isActive: row.isActive,
    isSeeded: row.isSeeded,
    updatedAt: row.updatedAt,
  };
}

export function toUnitEntry(row: UnitRow, campusName: string): Unit {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    kind: row.kind,
    campusId: row.campusId,
    campusName,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    isSeeded: row.isSeeded,
    updatedAt: row.updatedAt,
  };
}

export function toProgramEntry(row: ProgramRow, unitName: string): Program {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    level: row.level,
    unitId: row.unitId,
    unitName,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    isSeeded: row.isSeeded,
    updatedAt: row.updatedAt,
  };
}

export function toDirectoryEntry(row: DirectoryRow): Department {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    isSeeded: row.isSeeded,
    updatedAt: row.updatedAt,
  };
}

export function toSdgEntry(row: SdgRow): Sdg {
  return {
    id: row.id,
    number: row.number,
    title: row.title,
    isActive: row.isActive,
    isSeeded: row.isSeeded,
    updatedAt: row.updatedAt,
  };
}

export function toTermEntry(row: TermRow): Term {
  return {
    id: row.id,
    schoolYear: row.schoolYear,
    semester: toSemester(row.semester),
    startsOn: row.startsOn,
    endsOn: row.endsOn,
    isCurrent: row.isCurrent,
    isActive: row.isActive,
    isSeeded: row.isSeeded,
    updatedAt: row.updatedAt,
  };
}

export function toAttachmentRequirementEntry(row: AttachmentRow): AttachmentRequirement {
  return {
    id: row.id,
    activityType: row.activityType,
    label: row.label,
    minCount: row.minCount,
    isRequired: row.isRequired,
    isActive: row.isActive,
    isSeeded: row.isSeeded,
    updatedAt: row.updatedAt,
  };
}
