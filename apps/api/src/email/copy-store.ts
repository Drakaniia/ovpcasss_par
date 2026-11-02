import {
  createDb,
  createSettingsQueries,
  EMAIL_TEMPLATE_KEY_PREFIX,
  emailKindFromKey,
} from '@par/db';
import { defaultCopyFor } from '@par/email';
import {
  EMAIL_KINDS,
  parseEmailTemplateCopy,
  type EmailKind,
  type EmailTemplateCopy,
} from '@par/shared';

import type { Env } from '../env';

/** The saved copy a send path composes with, defaulting per kind. */
export interface EmailCopy {
  get(kind: EmailKind): EmailTemplateCopy;
}

const builtIn: EmailCopy = { get: (kind) => defaultCopyFor(kind) };

export function defaultEmailCopy(): EmailCopy {
  return builtIn;
}

/**
 * Per-request cache. One `notify()` or one receipt batch reads the 15 rows once;
 * a Worker instance handles many requests, so the key is the request's own `env`
 * object rather than a module-level value.
 */
const inFlight = new WeakMap<object, Promise<EmailCopy>>();

/**
 * Read the administrator's saved copy (email message editor spec §7). A row that
 * no longer parses, or that fails the editor's own rules, is ignored: the
 * built-in copy is sent rather than a mail the office cannot trust. A failure to
 * read at all is logged and every kind falls back, so mail never stops because a
 * setting could not be read.
 */
export function loadEmailCopy(env: Env): Promise<EmailCopy> {
  const cached = inFlight.get(env);
  if (cached) return cached;

  const pending = readCopy(env).catch((error: unknown) => {
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'Saved email copy could not be read; the built-in copy is in use',
        reason: error instanceof Error ? error.message : 'unknown',
      }),
    );
    return builtIn;
  });

  inFlight.set(env, pending);
  return pending;
}

async function readCopy(env: Env): Promise<EmailCopy> {
  const rows = await createSettingsQueries(createDb(env.DB)).listByPrefix(EMAIL_TEMPLATE_KEY_PREFIX);
  const saved = new Map<EmailKind, EmailTemplateCopy>();

  for (const row of rows) {
    const kind = emailKindFromKey(row.key);
    if (!kind || !(EMAIL_KINDS as readonly string[]).includes(kind)) continue;

    let value: unknown;
    try {
      value = JSON.parse(row.value);
    } catch {
      continue;
    }

    const parsed = parseEmailTemplateCopy(kind as EmailKind, value);
    if (!parsed.success || parsed.issues.length > 0) continue;
    saved.set(kind as EmailKind, parsed.copy);
  }

  return { get: (kind) => saved.get(kind) ?? defaultCopyFor(kind) };
}
