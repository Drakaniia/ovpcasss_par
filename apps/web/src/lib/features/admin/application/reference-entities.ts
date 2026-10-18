import {
  attachmentRequirementInputSchema,
  campusInputSchema,
  departmentInputSchema,
  officeInputSchema,
  programInputSchema,
  sdgInputSchema,
  termInputSchema,
  unitInputSchema,
  type ReferenceEntityKey,
} from '@par/shared';

import { attachmentRequirements } from './reference-entity-attachment-requirements';
import { campuses } from './reference-entity-campuses';
import { departments, offices } from './reference-entity-directories';
import { programs } from './reference-entity-programs';
import { sdgs } from './reference-entity-sdgs';
import { terms } from './reference-entity-terms';
import { units } from './reference-entity-units';
import type {
  ReferenceEntityConfig,
  ReferenceFieldOption,
  ReferenceRelated,
  ReferenceRow,
} from './reference-types';

export const REFERENCE_ENTITY_CONFIGS: Record<ReferenceEntityKey, ReferenceEntityConfig> = {
  campuses,
  units,
  programs,
  departments,
  offices,
  sdgs,
  terms,
  'attachment-requirements': attachmentRequirements,
};

/** Tab order is part of the contract, not the object key order. */
export const REFERENCE_ENTITY_ORDER: readonly ReferenceEntityKey[] = [
  'campuses',
  'units',
  'programs',
  'departments',
  'offices',
  'sdgs',
  'terms',
  'attachment-requirements',
];

type SafeParseResult =
  | { success: true; data: unknown }
  | { success: false; error: { issues: Array<{ path: PropertyKey[]; message: string }> } };

type SchemaLike = { safeParse: (value: unknown) => unknown };

function runSchema(schema: SchemaLike, values: unknown): SafeParseResult {
  return schema.safeParse(values) as SafeParseResult;
}

/** Parses an entity input with the shared Zod contract, returning its messages. */
export function validateInput(
  entity: ReferenceEntityKey,
  values: unknown,
): { input: unknown | null; errors: Record<string, string> } {
  const schema: SchemaLike =
    entity === 'campuses'
      ? campusInputSchema
      : entity === 'units'
        ? unitInputSchema
        : entity === 'programs'
          ? programInputSchema
          : entity === 'departments'
            ? departmentInputSchema
            : entity === 'offices'
              ? officeInputSchema
              : entity === 'sdgs'
                ? sdgInputSchema
                : entity === 'terms'
                  ? termInputSchema
                  : attachmentRequirementInputSchema;

  const result = runSchema(schema, values);
  if (result.success) return { input: result.data, errors: {} };

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? '');
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return { input: null, errors };
}

export function optionsForField(
  config: ReferenceEntityConfig,
  fieldName: string,
  rows: readonly ReferenceRow[],
  related: ReferenceRelated,
  editingId: string | null,
): readonly ReferenceFieldOption[] {
  const field = config.fields.find((entry) => entry.name === fieldName);
  if (!field) return [];

  if (field.name === 'campusId') {
    return (related.campuses ?? []).map((row) => ({
      value: row.id,
      label: row.isActive ? row.name : `${row.name} (inactive)`,
    }));
  }

  if (field.name === 'unitId') {
    return (related.units ?? []).map((row) => ({
      value: row.id,
      label: row.isActive ? row.name : `${row.name} (inactive)`,
    }));
  }

  if (field.name === 'number') {
    const current = editingId ? rows.find((row) => row.id === editingId) : undefined;
    const used = new Set(
      rows.filter((row) => row.id !== editingId).map((row) => Number(row.cells.number)),
    );

    return Array.from({ length: 17 }, (_, index) => index + 1)
      .filter((number) => !used.has(number))
      .map((number) => ({
        value: number,
        label:
          current && Number(current.cells.number) === number
            ? `${number} (current)`
            : String(number),
      }));
  }

  return field.options ?? [];
}
