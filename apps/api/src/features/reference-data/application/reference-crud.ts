import {
  attachmentRequirementInputSchema,
  campusInputSchema,
  departmentInputSchema,
  officeInputSchema,
  programInputSchema,
  sdgInputSchema,
  termInputSchema,
  unitInputSchema,
  type AttachmentRequirementInput,
  type CampusInput,
  type DepartmentInput,
  type ProgramInput,
  type ReferenceEntityKey,
  type ReferenceEntry,
  type ReferenceInput,
  type SdgInput,
  type TermInput,
  type UnitInput,
} from '@par/shared';
import type { z } from 'zod';

import { createId } from '../../../lib/ids';
import { toStoredSemester } from '../domain/reference-entry';
import type {
  ReferenceInsertValues,
  ReferenceRepository,
  ReferenceUpdateValues,
} from '../infrastructure/reference-repository';

/** The create/update request body each entity accepts (spec §8). */
const INPUT_SCHEMAS: Record<ReferenceEntityKey, z.ZodType> = {
  campuses: campusInputSchema,
  units: unitInputSchema,
  programs: programInputSchema,
  departments: departmentInputSchema,
  offices: officeInputSchema,
  sdgs: sdgInputSchema,
  terms: termInputSchema,
  'attachment-requirements': attachmentRequirementInputSchema,
};

export type ReferenceInputParse =
  | { ok: true; data: ReferenceInput }
  | { ok: false; issues: unknown[] };

export function parseReferenceInput(
  entity: ReferenceEntityKey,
  body: unknown,
): ReferenceInputParse {
  const parsed = INPUT_SCHEMAS[entity].safeParse(body);
  if (!parsed.success) return { ok: false, issues: parsed.error.issues };
  return { ok: true, data: parsed.data as ReferenceInput };
}

export function buildCreateRow(
  entity: ReferenceEntityKey,
  input: ReferenceInput,
  now: string,
): ReferenceInsertValues {
  const base = {
    id: createId(),
    createdAt: now,
    updatedAt: now,
    isSeeded: false,
    isActive: input.isActive,
  };

  switch (entity) {
    case 'campuses': {
      const value = input as CampusInput;
      return { ...base, code: value.code, name: value.name, sortOrder: value.sortOrder };
    }
    case 'units': {
      const value = input as UnitInput;
      return {
        ...base,
        code: value.code,
        name: value.name,
        kind: value.kind,
        campusId: value.campusId,
        sortOrder: value.sortOrder,
      };
    }
    case 'programs': {
      const value = input as ProgramInput;
      return {
        ...base,
        code: value.code,
        name: value.name,
        level: value.level,
        unitId: value.unitId,
        sortOrder: value.sortOrder,
      };
    }
    case 'departments':
    case 'offices': {
      const value = input as DepartmentInput;
      return { ...base, name: value.name, sortOrder: value.sortOrder };
    }
    case 'sdgs': {
      const value = input as SdgInput;
      return { ...base, number: value.number, title: value.title };
    }
    case 'terms': {
      const value = input as TermInput;
      return {
        ...base,
        schoolYear: value.schoolYear,
        semester: toStoredSemester(value.semester),
        startsOn: value.startsOn,
        endsOn: value.endsOn,
        isCurrent: false,
      };
    }
    case 'attachment-requirements': {
      const value = input as AttachmentRequirementInput;
      return {
        ...base,
        activityType: value.activityType,
        label: value.label,
        minCount: value.minCount,
        isRequired: value.isRequired,
      };
    }
  }
}

export function buildUpdateRow(
  entity: ReferenceEntityKey,
  input: ReferenceInput,
  now: string,
): ReferenceUpdateValues {
  switch (entity) {
    case 'campuses': {
      const value = input as CampusInput;
      return {
        code: value.code,
        name: value.name,
        sortOrder: value.sortOrder,
        isActive: value.isActive,
        updatedAt: now,
      };
    }
    case 'units': {
      const value = input as UnitInput;
      return {
        code: value.code,
        name: value.name,
        kind: value.kind,
        campusId: value.campusId,
        sortOrder: value.sortOrder,
        isActive: value.isActive,
        updatedAt: now,
      };
    }
    case 'programs': {
      const value = input as ProgramInput;
      return {
        code: value.code,
        name: value.name,
        level: value.level,
        unitId: value.unitId,
        sortOrder: value.sortOrder,
        isActive: value.isActive,
        updatedAt: now,
      };
    }
    case 'departments':
    case 'offices': {
      const value = input as DepartmentInput;
      return { name: value.name, sortOrder: value.sortOrder, isActive: value.isActive, updatedAt: now };
    }
    case 'sdgs': {
      const value = input as SdgInput;
      return { number: value.number, title: value.title, isActive: value.isActive, updatedAt: now };
    }
    case 'terms': {
      const value = input as TermInput;
      return {
        schoolYear: value.schoolYear,
        semester: toStoredSemester(value.semester),
        startsOn: value.startsOn,
        endsOn: value.endsOn,
        isActive: value.isActive,
        updatedAt: now,
      };
    }
    case 'attachment-requirements': {
      const value = input as AttachmentRequirementInput;
      return {
        activityType: value.activityType,
        label: value.label,
        minCount: value.minCount,
        isRequired: value.isRequired,
        isActive: value.isActive,
        updatedAt: now,
      };
    }
  }
}

export function listReference(
  repository: ReferenceRepository,
  entity: ReferenceEntityKey,
): Promise<ReferenceEntry[]> {
  return repository.list(entity);
}

export function getReference(
  repository: ReferenceRepository,
  entity: ReferenceEntityKey,
  id: string,
): Promise<ReferenceEntry | null> {
  return repository.findById(entity, id);
}

export function createReference(
  repository: ReferenceRepository,
  entity: ReferenceEntityKey,
  input: ReferenceInput,
): Promise<ReferenceEntry> {
  return repository.create(entity, buildCreateRow(entity, input, new Date().toISOString()));
}

export function updateReference(
  repository: ReferenceRepository,
  entity: ReferenceEntityKey,
  id: string,
  input: ReferenceInput,
): Promise<ReferenceEntry | null> {
  return repository.update(entity, id, buildUpdateRow(entity, input, new Date().toISOString()));
}

export function deactivateReference(
  repository: ReferenceRepository,
  entity: ReferenceEntityKey,
  id: string,
): Promise<ReferenceEntry | null> {
  return repository.setActive(entity, id, false, new Date().toISOString());
}

export function activateReference(
  repository: ReferenceRepository,
  entity: ReferenceEntityKey,
  id: string,
): Promise<ReferenceEntry | null> {
  return repository.setActive(entity, id, true, new Date().toISOString());
}
