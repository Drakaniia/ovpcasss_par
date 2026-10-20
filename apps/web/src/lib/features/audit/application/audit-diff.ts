export interface FormattedDiffEntry {
  key: string;
  before: string;
  after: string;
  changed: boolean;
}

export interface DiffResult {
  changed: FormattedDiffEntry[];
  unchanged: FormattedDiffEntry[];
  hasChanges: boolean;
}

const SECRET_KEY_PATTERN = /(password|hash|token|secret|signature|signed_?url)/i;

export function isSecretKey(key: string): boolean {
  return SECRET_KEY_PATTERN.test(key);
}

export function formatDiffValue(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return '—';
    return value.map((item, index) => `${index + 1}. ${String(item)}`).join('\n');
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

function flatten(
  obj: Record<string, unknown> | null | undefined,
  prefix = '',
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (!obj || typeof obj !== 'object') return result;

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flatten(value as Record<string, unknown>, fullKey));
    } else {
      result[fullKey] = value;
    }
  }
  return result;
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((val, index) => val === b[index]);
  }
  return JSON.stringify(a) === JSON.stringify(b);
}

export function computeDiff(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
): DiffResult {
  const flatBefore = flatten(before);
  const flatAfter = flatten(after);

  const allKeys = Array.from(
    new Set([...Object.keys(flatBefore), ...Object.keys(flatAfter)]),
  ).sort();

  if (allKeys.length === 0) {
    return { changed: [], unchanged: [], hasChanges: false };
  }

  const changed: FormattedDiffEntry[] = [];
  const unchanged: FormattedDiffEntry[] = [];

  for (const key of allKeys) {
    const rawBefore = flatBefore[key];
    const rawAfter = flatAfter[key];
    const isDifferent = !valuesEqual(rawBefore, rawAfter);

    const secret = isSecretKey(key);
    if (secret && import.meta.env?.DEV) {
      console.warn(`[Audit] Sensitive key displayed in diff: ${key}`);
    }

    const beforeFormatted = secret ? '[redacted]' : formatDiffValue(rawBefore);
    const afterFormatted = secret ? '[redacted]' : formatDiffValue(rawAfter);

    const entry: FormattedDiffEntry = {
      key,
      before: beforeFormatted,
      after: afterFormatted,
      changed: isDifferent,
    };

    if (isDifferent) {
      changed.push(entry);
    } else {
      unchanged.push(entry);
    }
  }

  return {
    changed,
    unchanged,
    hasChanges: changed.length > 0,
  };
}
