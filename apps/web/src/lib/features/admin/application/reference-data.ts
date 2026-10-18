import type { ReferenceEntityKey, ReferenceEntry, ReferenceInput } from '@par/shared';

import {
  REFERENCE_ENTITY_CONFIGS,
  REFERENCE_ENTITY_ORDER,
  validateInput,
} from './reference-entities';
import type {
  ReferenceDraft,
  ReferenceDraftValues,
  ReferenceEntityConfig,
  ReferenceRow,
} from './reference-types';

/**
 * Reference-data rules shared by the table, drawer, and page (UI phase 04).
 * The eight entity shapes live in `reference-entities.ts`; nothing here is
 * entity-specific beyond the definitions it reads.
 */

export function isEntityKey(value: string | null): value is ReferenceEntityKey {
  return value !== null && (REFERENCE_ENTITY_ORDER as readonly string[]).includes(value);
}

export function entityFromParams(params: URLSearchParams): ReferenceEntityKey {
  const requested = params.get('entity');
  return isEntityKey(requested) ? requested : 'campuses';
}

export function showInactiveFromParams(params: URLSearchParams): boolean {
  return params.get('inactive') === '1';
}

/** Tabs are URL state, so a shared link reproduces the exact view. */
export function paramsForView(entity: ReferenceEntityKey, showInactive: boolean): string {
  const params = new URLSearchParams();
  if (entity !== 'campuses') params.set('entity', entity);
  if (showInactive) params.set('inactive', '1');
  return params.toString();
}

export function configFor(entity: ReferenceEntityKey): ReferenceEntityConfig {
  return REFERENCE_ENTITY_CONFIGS[entity];
}

export function rowsFromEntries(
  config: ReferenceEntityConfig,
  entries: readonly ReferenceEntry[],
): ReferenceRow[] {
  return entries.map((entry) => config.rowFrom(entry));
}

function compareRows(config: ReferenceEntityConfig, a: ReferenceRow, b: ReferenceRow): number {
  const left = config.sortValue(a);
  const right = config.sortValue(b);
  const primary =
    typeof left === 'number' && typeof right === 'number'
      ? left - right
      : String(left).localeCompare(String(right));

  const ordered = config.sortDescending ? -primary : primary;
  return ordered !== 0 ? ordered : a.name.localeCompare(b.name);
}

/** Default sort is the entity's sort value, then name. */
export function visibleRows(
  config: ReferenceEntityConfig,
  rows: readonly ReferenceRow[],
  showInactive: boolean,
): ReferenceRow[] {
  return rows
    .filter((row) => showInactive || row.isActive)
    .sort((a, b) => compareRows(config, a, b));
}

export function draftForCreate(
  config: ReferenceEntityConfig,
  rows: readonly ReferenceRow[],
): ReferenceDraft {
  return {
    id: null,
    values: config.createValues(rows),
    isSeeded: false,
    isCurrent: false,
  };
}

export function draftFromRow(config: ReferenceEntityConfig, row: ReferenceRow): ReferenceDraft {
  return {
    id: row.id,
    values: config.valuesFrom(row.entry),
    isSeeded: row.isSeeded,
    isCurrent: row.isCurrent,
    blockedReason: row.blockedReason,
    warning: row.warning,
  };
}

export function drawerTitle(config: ReferenceEntityConfig, draft: ReferenceDraft): string {
  return `${draft.id ? 'Edit' : 'Add'} ${config.singular}`;
}

export function savedMessage(config: ReferenceEntityConfig): string {
  const label = config.singular === 'SDG' ? 'SDG' : config.singular;
  return `${label.charAt(0).toUpperCase()}${label.slice(1)} saved`;
}

function requiredMessage(field: ReferenceEntityConfig['fields'][number]): string {
  if (field.kind === 'select') {
    if (field.name === 'number') return 'Choose a number.';
    return `Choose ${field.label.toLowerCase()}.`;
  }
  if (field.kind === 'date') return 'Choose a date.';
  if (field.kind === 'number') return 'Enter a number.';
  return `Enter ${field.label.toLowerCase()}.`;
}

/** Field errors first, then the shared Zod contract, all keyed by field name. */
export function validateDraft(
  config: ReferenceEntityConfig,
  values: ReferenceDraftValues,
): { errors: Record<string, string>; input: ReferenceInput | null } {
  const errors: Record<string, string> = {};

  for (const field of config.fields) {
    const value = values[field.name];
    const empty = value === undefined || value === null || String(value).trim() === '';

    if (field.required && empty) {
      errors[field.name] = requiredMessage(field);
      continue;
    }

    if (field.kind === 'number' && !empty && Number.isNaN(Number(value))) {
      errors[field.name] = 'Enter a number.';
    }
  }

  const parsed = validateInput(config.key, config.inputFrom(values));
  for (const [key, message] of Object.entries(parsed.errors)) {
    if (key && !errors[key]) errors[key] = message;
  }

  return {
    errors,
    input: Object.keys(errors).length === 0 ? (parsed.input as ReferenceInput | null) : null,
  };
}

export type DuplicateMatch = {
  row: ReferenceRow;
  message: string;
};

function comparable(key: string, value: unknown): string {
  const raw = String(value ?? '').trim();
  return key === 'number' ? String(Number(raw)) : raw.toLowerCase();
}

/** Only names, codes, and SDG numbers are checked. */
export function findDuplicate(
  config: ReferenceEntityConfig,
  rows: readonly ReferenceRow[],
  values: ReferenceDraftValues,
  editingId: string | null,
): DuplicateMatch | null {
  for (const key of config.duplicateFields) {
    const incoming = comparable(key, values[key]);
    if (!incoming && key !== 'number') continue;

    const row = rows.find(
      (candidate) =>
        candidate.id !== editingId && comparable(key, candidate.cells[key]) === incoming,
    );
    if (row) return { row, message: duplicateMessage(config, key, row) };
  }

  return null;
}

function duplicateMessage(config: ReferenceEntityConfig, key: string, row: ReferenceRow): string {
  if (key === 'code') {
    return `A ${config.singular} with the code “${row.cells.code}” already exists. Save anyway?`;
  }
  if (key === 'number') {
    return `SDG ${row.cells.number} already exists. Save anyway?`;
  }
  return `A ${config.singular} named “${row.cells.name}” already exists. Save anyway?`;
}

export type DeactivationCopy = {
  title: string;
  description: string;
  confirmLabel: string;
  blockedReason?: string;
};

export function deactivationFor(
  config: ReferenceEntityConfig,
  row: ReferenceRow,
): DeactivationCopy {
  const consequence =
    'Deactivated entries stay in existing reports but no longer appear in new forms.';

  return {
    title:
      config.key === 'sdgs'
        ? `Deactivate “${row.name}”?`
        : `Deactivate ${config.singular} “${row.name}”?`,
    description: row.warning ? `${row.warning} ${consequence}` : consequence,
    confirmLabel: 'Deactivate',
    blockedReason: row.blockedReason,
  };
}
