/**
 * Row model for `EditableSelect` (UI spec §4.2). Kept pure so the filtering,
 * the create/use-custom offer, and the keyboard walk are unit-tested without a
 * DOM: the component only renders what this returns.
 */

/**
 * `name` is the editable name when the option's `value` is an identifier, so a
 * rename starts from "Main Campus" and not from its id.
 */
export type EditableSelectOption = { value: string; label: string; name?: string };

export type EditableSelectRow =
  | { kind: 'option'; value: string; label: string; name?: string; selected: boolean }
  | { kind: 'create'; name: string; label: string }
  | { kind: 'custom'; name: string; label: string };

export type RowContext = {
  /** The current form value, so its row can be marked and focused on open. */
  value: string;
  /** An admin may add the typed name to the official list. */
  canCreate: boolean;
  /** Anyone may type a value the list does not hold (the old "Other"). */
  allowCustom: boolean;
};

export function rowsFor(
  options: readonly EditableSelectOption[],
  query: string,
  { value, canCreate, allowCustom }: RowContext,
): EditableSelectRow[] {
  const typed = query.trim();
  const needle = typed.toLowerCase();

  const visible = needle
    ? options.filter(
        (option) =>
          option.label.toLowerCase().includes(needle) ||
          option.value.toLowerCase().includes(needle),
      )
    : options;

  const rows: EditableSelectRow[] = visible.map((option) => ({
    kind: 'option',
    value: option.value,
    label: option.label,
    ...(option.name ? { name: option.name } : {}),
    selected: option.value === value,
  }));

  // A name already in the list is a match, never a second entry.
  if (!typed) return rows;
  const exact = options.some((option) => option.label.trim().toLowerCase() === needle);
  if (exact) return rows;

  if (canCreate) rows.push({ kind: 'create', name: typed, label: `Add “${typed}”` });
  else if (allowCustom) rows.push({ kind: 'custom', name: typed, label: `Use “${typed}”` });

  return rows;
}

export type RowAction = 'rename' | 'remove';

/**
 * `F2` renames and `Shift+Delete` removes the highlighted entry (bug phase 01
 * §3.7). Only an official entry carries those actions: the "Add …" and free-text
 * rows are a name being created, not a row the office maintains, and plain
 * `Delete` stays with the search box that owns Delete and Backspace.
 */
export function rowActionFor(
  row: EditableSelectRow | null,
  event: { key: string; shiftKey?: boolean },
): RowAction | null {
  if (!row || row.kind !== 'option') return null;
  if (event.key === 'F2') return 'rename';
  if (event.key === 'Delete' && event.shiftKey) return 'remove';
  return null;
}

/** The selected row opens highlighted; an empty list starts at the first row. */
export function initialRowIndex(rows: readonly EditableSelectRow[]): number {
  const selected = rows.findIndex((row) => row.kind === 'option' && row.selected);
  return selected === -1 ? 0 : selected;
}

/** Arrow keys wrap at both ends, matching every other list in the shell. */
export function stepRowIndex(index: number, length: number, delta: number): number {
  if (length === 0) return -1;
  return (index + delta + length) % length;
}

/** The trigger shows the list's label, or the typed value when it is custom. */
export function triggerLabel(
  options: readonly EditableSelectOption[],
  value: string,
  placeholder: string,
): string {
  if (!value) return placeholder;
  const option = options.find((entry) => entry.value === value);
  return option ? option.label : value;
}
