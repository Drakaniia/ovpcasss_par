/**
 * Optional profile text (UI spec §7.14). A cleared field arrives as an empty or
 * whitespace string, and "cleared" has to mean null in the row — otherwise the
 * profile card would restore the old value on the next read.
 */
export function normalizeOptional(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
