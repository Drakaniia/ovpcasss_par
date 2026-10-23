export const REFERENCE_PREFIX = 'AR No.';

const FOUR_DIGITS = 4;

/** Formats `AR No. 0001`; the sequence grows past four digits as needed. */
export function formatReferenceNo(sequence: number): string {
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new RangeError(`Invalid AR No. sequence: ${sequence}`);
  }

  return `${REFERENCE_PREFIX} ${String(sequence).padStart(FOUR_DIGITS, '0')}`;
}

/** Reads the sequence back out of any spelling of the reference. */
export function parseReferenceNo(value: string): number | null {
  const digits = value.replace(/\D/g, '');
  if (!digits) return null;

  const sequence = Number(digits);
  return Number.isInteger(sequence) && sequence >= 1 ? sequence : null;
}

/**
 * The spellings a reference search should accept: `0001`, `AR No. 0001`, and
 * the punctuation-free `AR No 0001` all reach the same record.
 */
export function referenceSearchTerms(value: string): string[] {
  const trimmed = value.trim();
  const terms = new Set<string>();
  if (trimmed) terms.add(trimmed);

  const sequence = parseReferenceNo(trimmed);
  if (sequence !== null) {
    const padded = String(sequence).padStart(FOUR_DIGITS, '0');
    terms.add(String(sequence));
    terms.add(padded);
    terms.add(formatReferenceNo(sequence));
    terms.add(`AR No ${padded}`);
  }

  return [...terms];
}
