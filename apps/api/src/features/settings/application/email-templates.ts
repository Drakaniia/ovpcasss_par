import {
  createDb,
  createSettingsQueries,
  createUserQueries,
  EMAIL_TEMPLATE_KEY_PREFIX,
  emailKindFromKey,
  emailTemplateKey,
  type SettingsRow,
} from '@par/db';
import { defaultCopyFor, previewEmail, tokenOptionsFor } from '@par/email';
import {
  EMAIL_KINDS,
  EMAIL_KIND_LABELS,
  EMAIL_TEMPLATE_SLOTS,
  parseEmailTemplateCopy,
  type EmailKind,
  type EmailTemplateCopy,
  type EmailTemplateDetail,
  type EmailTemplateSummary,
} from '@par/shared';

import type { Env } from '../../../env';

/**
 * Reading and writing the administrator's message copy (email message editor
 * spec §6). The API is the only door to D1; the web app receives this shape and
 * never composes mail.
 */

export interface TemplateRecord {
  copy: EmailTemplateCopy;
  /** A valid saved row exists. */
  edited: boolean;
  /** A row exists but no longer parses or validates. */
  unreadable: boolean;
  row: SettingsRow | null;
}

function queries(env: Env) {
  return createSettingsQueries(createDb(env.DB));
}

async function records(env: Env): Promise<Map<EmailKind, TemplateRecord>> {
  const rows = await queries(env).listByPrefix(EMAIL_TEMPLATE_KEY_PREFIX);
  const state = new Map<EmailKind, TemplateRecord>();

  for (const kind of EMAIL_KINDS) {
    state.set(kind, {
      copy: defaultCopyFor(kind),
      edited: false,
      unreadable: false,
      row: null,
    });
  }

  for (const row of rows) {
    const kind = emailKindFromKey(row.key);
    if (!kind || !(EMAIL_KINDS as readonly string[]).includes(kind)) continue;
    const record = state.get(kind as EmailKind);
    if (!record) continue;

    record.row = row;

    let value: unknown;
    try {
      value = JSON.parse(row.value);
    } catch {
      record.unreadable = true;
      continue;
    }

    const parsed = parseEmailTemplateCopy(kind as EmailKind, value);
    if (!parsed.success || parsed.issues.length > 0) {
      record.unreadable = true;
      continue;
    }

    record.copy = parsed.copy;
    record.edited = true;
  }

  return state;
}

async function editorNames(env: Env, rows: readonly SettingsRow[]): Promise<Map<string, string>> {
  const ids = [
    ...new Set(rows.map((row) => row.updatedByUserId).filter((id): id is string => Boolean(id))),
  ];
  if (ids.length === 0) return new Map();

  const users = createUserQueries(createDb(env.DB));
  const found = await Promise.all(ids.map((id) => users.findById(id)));

  return new Map(
    found
      .filter((user): user is NonNullable<typeof user> => user !== null)
      .map((user) => [user.id, user.fullName]),
  );
}

export async function listEmailTemplates(env: Env): Promise<EmailTemplateSummary[]> {
  const state = await records(env);
  const names = await editorNames(
    env,
    [...state.values()].map((record) => record.row).filter((row): row is SettingsRow => Boolean(row)),
  );

  return EMAIL_KINDS.map((kind) => {
    const record = state.get(kind) ?? {
      copy: defaultCopyFor(kind),
      edited: false,
      unreadable: false,
      row: null,
    };

    return {
      kind,
      label: EMAIL_KIND_LABELS[kind],
      audience: EMAIL_TEMPLATE_SLOTS[kind].audience,
      edited: record.edited,
      unreadable: record.unreadable,
      subject: previewEmail(kind, record.copy).subject,
      updatedAt: record.row?.updatedAt ?? null,
      updatedByName: record.row?.updatedByUserId
        ? (names.get(record.row.updatedByUserId) ?? null)
        : null,
    };
  });
}

export async function emailTemplateDetail(
  env: Env,
  kind: EmailKind,
): Promise<EmailTemplateDetail> {
  const record = (await records(env)).get(kind);
  const slots = EMAIL_TEMPLATE_SLOTS[kind];
  const names = await editorNames(env, record?.row ? [record.row] : []);

  return {
    kind,
    label: EMAIL_KIND_LABELS[kind],
    audience: slots.audience,
    edited: record?.edited ?? false,
    unreadable: record?.unreadable ?? false,
    copy: record?.copy ?? defaultCopyFor(kind),
    defaults: defaultCopyFor(kind),
    tokens: tokenOptionsFor(kind),
    branches: slots.branches.map((branch) => ({ key: branch.key, label: branch.label })),
    hasFacts: slots.hasFacts,
    factsSource: slots.factsSource,
    hasQuote: slots.hasQuote,
    hasAction: slots.hasAction,
    updatedAt: record?.row?.updatedAt ?? null,
    updatedByName: record?.row?.updatedByUserId
      ? (names.get(record.row.updatedByUserId) ?? null)
      : null,
  };
}

export async function saveEmailTemplate(
  env: Env,
  kind: EmailKind,
  copy: EmailTemplateCopy,
  adminUserId: string,
  now = new Date().toISOString(),
): Promise<void> {
  await queries(env).put({
    key: emailTemplateKey(kind),
    value: copy,
    now,
    updatedByUserId: adminUserId,
  });
}

export async function restoreEmailTemplate(env: Env, kind: EmailKind): Promise<void> {
  await queries(env).delete(emailTemplateKey(kind));
}

export async function restoreAllEmailTemplates(env: Env): Promise<number> {
  return queries(env).deleteByPrefix(EMAIL_TEMPLATE_KEY_PREFIX);
}

/** The preview render: the submitted copy with the kind's sample record. */
export function renderEmailTemplatePreview(
  kind: EmailKind,
  copy: EmailTemplateCopy,
  origin: string,
) {
  return previewEmail(kind, copy, origin);
}
