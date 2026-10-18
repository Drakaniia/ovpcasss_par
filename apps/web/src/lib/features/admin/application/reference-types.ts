import type { ReferenceEntityKey, ReferenceEntry, ReferenceInput } from '@par/shared';

/**
 * The entity definitions below are the single place that knows how each of the
 * eight reference entities is labelled, columns, validates, and builds a draft.
 * Presentation components stay generic (UI phase 04).
 */

export type ReferenceFieldValue = string | number | boolean;
export type ReferenceDraftValues = Record<string, ReferenceFieldValue>;

export type ReferenceFieldOption = {
  value: string | number;
  label: string;
};

export type ReferenceField = {
  name: string;
  label: string;
  kind: 'text' | 'number' | 'select' | 'date' | 'toggle';
  required?: boolean;
  hint?: string;
  uppercase?: boolean;
  /** SDG numbers cannot change after creation. */
  immutableOnEdit?: boolean;
  options?: readonly ReferenceFieldOption[];
  min?: number;
  max?: number;
};

export type ReferenceColumn = {
  key: string;
  label: string;
  numeric?: boolean;
  mono?: boolean;
  /** Hidden below 1280 px, after the entity-specific columns collapse. */
  secondary?: boolean;
};

export type ReferenceRow = {
  id: string;
  /** Name used in confirmations, never empty. */
  name: string;
  cells: Record<string, string | number | null>;
  isActive: boolean;
  isSeeded: boolean;
  isCurrent: boolean;
  /** A deactivation that must not happen, with the reason shown next to it. */
  blockedReason?: string;
  /** A deactivation that is allowed but should be confirmed with context. */
  warning?: string;
  entry: ReferenceEntry;
};

export type ReferenceDraft = {
  id: string | null;
  values: ReferenceDraftValues;
  isSeeded: boolean;
  isCurrent: boolean;
  /** Shown next to Deactivate so a blocked action always explains itself. */
  blockedReason?: string;
  warning?: string;
};

export type ReferenceValidation = {
  errors: Record<string, string>;
  input: ReferenceInput | null;
};

export type ReferenceEntityConfig = {
  key: ReferenceEntityKey;
  label: string;
  singular: string;
  /** Where this entity is used, shown in the empty state. */
  usage: string;
  columns: (rows: readonly ReferenceRow[]) => ReferenceColumn[];
  fields: readonly ReferenceField[];
  duplicateFields: readonly string[];
  note?: (values: ReferenceDraftValues) => string | undefined;
  createValues: (rows: readonly ReferenceRow[]) => ReferenceDraftValues;
  valuesFrom: (entry: ReferenceEntry) => ReferenceDraftValues;
  rowFrom: (entry: ReferenceEntry) => ReferenceRow;
  inputFrom: (values: ReferenceDraftValues) => ReferenceInput;
  sortValue: (row: ReferenceRow) => string | number;
  sortDescending?: boolean;
};

export type ReferenceRelated = {
  campuses?: ReferenceRow[];
  units?: ReferenceRow[];
};
