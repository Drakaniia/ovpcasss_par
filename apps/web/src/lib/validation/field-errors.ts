/**
 * Structural shape of a Zod schema, so callers keep the schema's output type
 * without depending on Zod's internal type parameters.
 */
export type FormSchema<T> = {
  safeParse: (input: unknown) => {
    success: boolean;
    data?: T;
    error?: { issues: ReadonlyArray<{ path: PropertyKey[]; message: string }> };
  };
};

export type FieldErrors = Record<string, string>;

export type ParseResult<T> = { ok: true; data: T } | { ok: false; errors: FieldErrors };

/**
 * Validates at the edge with the shared Zod contract and reduces issues to one
 * message per field (UI spec §8.4: validate on blur and submit, not while typing).
 */
export function parseForm<T>(schema: FormSchema<T>, input: unknown): ParseResult<T> {
  const result = schema.safeParse(input);

  if (result.success) return { ok: true, data: result.data as T };

  const errors: FieldErrors = {};
  for (const issue of result.error?.issues ?? []) {
    const key = issue.path[0];
    if (typeof key === 'string' && errors[key] === undefined) {
      errors[key] = issue.message;
    }
  }

  return { ok: false, errors };
}

/** First message for a single field, used by blur validation. */
export function firstIssueOf<T>(schema: FormSchema<T>, value: unknown): string | undefined {
  const result = schema.safeParse(value);
  return result.success ? undefined : result.error?.issues[0]?.message;
}

/** Moves focus to the first invalid field in the form's own order. */
export function focusFirstError(errors: FieldErrors, order: readonly string[]): void {
  const key = order.find((field) => errors[field]);
  if (key) document.getElementById(key)?.focus();
}
