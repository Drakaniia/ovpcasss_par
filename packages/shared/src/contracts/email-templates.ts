import { z } from 'zod';

import type { EmailKind } from './email';
import {
  EMAIL_TEMPLATE_SLOTS,
  EMAIL_TEMPLATE_SUBJECT_MAX,
  EMAIL_TEMPLATE_TOKENS,
  type EmailToken,
} from './email-template-catalogue';

/* ------------------------------------------------------------------------- */
/* Copy shape                                                                 */
/* ------------------------------------------------------------------------- */

export const emailParagraphSchema = z.object({
  text: z
    .string()
    .min(1, 'Write the paragraph.')
    .max(800, 'Keep a paragraph under 800 characters.'),
  /** Branch key from `EMAIL_TEMPLATE_SLOTS`, or null for a paragraph always shown. */
  when: z.string().nullable(),
});
export type EmailParagraph = z.infer<typeof emailParagraphSchema>;

export const emailFactRowSchema = z.object({
  label: z.string().trim().min(1, 'Enter a label.').max(40, 'Keep a label under 40 characters.'),
  /** Exactly one token; the value is formatted by the app, never typed. */
  value: z.string(),
});
export type EmailFactRow = z.infer<typeof emailFactRowSchema>;

export const emailActionVariantSchema = z.object({
  when: z.string().nullable(),
  label: z
    .string()
    .trim()
    .min(1, 'Enter the button label.')
    .max(60, 'Keep the label under 60 characters.'),
  urlToken: z.string(),
});
export type EmailActionVariant = z.infer<typeof emailActionVariantSchema>;

export const emailTemplateCopySchema = z.object({
  subject: z
    .string()
    .trim()
    .min(1, 'Write the subject.')
    .max(EMAIL_TEMPLATE_SUBJECT_MAX, 'The subject is too long for the office tag.'),
  heading: z
    .string()
    .trim()
    .min(1, 'Write the heading.')
    .max(120, 'Keep the heading under 120 characters.'),
  greeting: z
    .string()
    .trim()
    .min(1, 'Write the greeting.')
    .max(60, 'Keep the greeting under 60 characters.'),
  intro: z.array(emailParagraphSchema).min(1).max(8),
  facts: z
    .object({
      enabled: z.boolean(),
      source: z.enum(['fixed', 'failures']),
      rows: z.array(emailFactRowSchema).max(6),
    })
    .nullable(),
  quote: z
    .object({
      enabled: z.boolean(),
      label: z
        .string()
        .trim()
        .min(1, 'Enter a label.')
        .max(60, 'Keep the label under 60 characters.'),
      body: z
        .string()
        .min(1, 'Write the quoted text.')
        .max(2000, 'Keep the quote under 2000 characters.'),
    })
    .nullable(),
  action: z
    .object({
      enabled: z.boolean(),
      variants: z.array(emailActionVariantSchema).min(1).max(3),
    })
    .nullable(),
  footer: z.object({
    enabled: z.boolean(),
    reference: z.string().max(120, 'Keep the footer line under 120 characters.'),
    note: z.string().max(300, 'Keep the footer note under 300 characters.'),
    replyNotice: z.boolean(),
  }),
});
export type EmailTemplateCopy = z.infer<typeof emailTemplateCopySchema>;

export interface EmailTemplateIssue {
  /** Dotted path inside the copy, e.g. `intro.1.text` or `quote.body`. */
  path: string;
  message: string;
  token?: string;
}

const TOKEN_PATTERN = /\{\{([^{}]*)\}\}/g;

function tokensIn(value: string): string[] {
  const found: string[] = [];
  for (const match of value.matchAll(TOKEN_PATTERN)) {
    const name = (match[1] ?? '').trim();
    if (name) found.push(name);
  }
  return found;
}

function texts(copy: EmailTemplateCopy): { path: string; value: string }[] {
  const entries: { path: string; value: string }[] = [
    { path: 'subject', value: copy.subject },
    { path: 'heading', value: copy.heading },
    { path: 'greeting', value: copy.greeting },
    ...copy.intro.map((paragraph, index) => ({
      path: `intro.${index}.text`,
      value: paragraph.text,
    })),
    { path: 'footer.reference', value: copy.footer.reference },
    { path: 'footer.note', value: copy.footer.note },
  ];

  for (const [index, row] of (copy.facts?.rows ?? []).entries()) {
    entries.push({ path: `facts.${index}.label`, value: row.label });
  }
  if (copy.quote) {
    entries.push({ path: 'quote.label', value: copy.quote.label });
    entries.push({ path: 'quote.body', value: copy.quote.body });
  }
  for (const [index, variant] of (copy.action?.variants ?? []).entries()) {
    entries.push({ path: `action.${index}.label`, value: variant.label });
  }

  return entries;
}

/**
 * The rules the editor and the API both apply (email message editor spec §6.1).
 * A copy with any issue is not saved: a message that has lost its tracking
 * number or its comment is worse than the built-in copy.
 */
export function emailTemplateIssues(
  kind: EmailKind,
  copy: EmailTemplateCopy,
): EmailTemplateIssue[] {
  const slots = EMAIL_TEMPLATE_SLOTS[kind];
  const allowed = new Set<string>(EMAIL_TEMPLATE_TOKENS[kind]);
  const issues: EmailTemplateIssue[] = [];

  for (const entry of texts(copy)) {
    for (const token of tokensIn(entry.value)) {
      if (!allowed.has(token)) {
        issues.push({
          path: entry.path,
          message: `{{${token}}} is not available in this message.`,
          token,
        });
      }
    }
    if (entry.value.includes('!')) {
      issues.push({
        path: entry.path,
        message: 'The office voice has no exclamation marks.',
      });
    }
    if (/https?:\/\//i.test(entry.value)) {
      issues.push({
        path: entry.path,
        message: 'Links live in the button, not in the body text.',
      });
    }
  }

  const branchKeys = new Set(slots.branches.map((branch) => branch.key));
  for (const [index, paragraph] of copy.intro.entries()) {
    if (paragraph.when !== null && !branchKeys.has(paragraph.when)) {
      issues.push({
        path: `intro.${index}.when`,
        message: 'That case is not part of this message.',
      });
    }
  }
  for (const branch of slots.branches) {
    if (!copy.intro.some((paragraph) => paragraph.when === branch.key)) {
      issues.push({
        path: 'intro',
        message: `Add the paragraph for “${branch.label}”.`,
      });
    }
  }

  if (copy.facts?.enabled && copy.facts.source === 'fixed') {
    for (const [index, row] of copy.facts.rows.entries()) {
      const value = row.value.trim();
      const match = /^\{\{([^{}]+)\}\}$/.exec(value);
      if (!match) {
        issues.push({
          path: `facts.${index}.value`,
          message: 'Choose one value for this row.',
        });
        continue;
      }
      const token = (match[1] ?? '').trim();
      if (!allowed.has(token)) {
        issues.push({
          path: `facts.${index}.value`,
          message: `{{${token}}} is not available in this message.`,
          token,
        });
      }
    }
  }

  if (copy.action?.enabled) {
    for (const [index, variant] of copy.action.variants.entries()) {
      if (variant.when !== null && !branchKeys.has(variant.when)) {
        issues.push({
          path: `action.${index}.when`,
          message: 'That case is not part of this message.',
        });
      }
      const match = /^\{\{([^{}]+)\}\}$/.exec(variant.urlToken.trim());
      const token = match ? (match[1] ?? '').trim() : '';
      if (!slots.actionTokens.includes(token as EmailToken)) {
        issues.push({
          path: `action.${index}.urlToken`,
          message: 'Choose a link for this button.',
        });
      }
    }
  }

  for (const requirement of slots.required) {
    if (requirement.path === 'quote.body' && !(copy.quote?.enabled ?? false)) continue;
    // A block the office switched off (or a failure list the app builds) is not
    // held to a token it no longer draws (E10).
    if (
      requirement.path === 'facts' &&
      (!(copy.facts?.enabled ?? false) || copy.facts?.source !== 'fixed')
    ) {
      continue;
    }

    const value = readPath(copy, requirement.path);
    if (value === null || !tokensIn(value).includes(requirement.token)) {
      issues.push({
        path: requirement.path,
        message: `This message needs {{${requirement.token}}}.`,
        token: requirement.token,
      });
    }
  }

  return issues;
}

function readPath(copy: EmailTemplateCopy, path: string): string | null {
  if (path === 'subject') return copy.subject;
  if (path === 'quote.body') return copy.quote?.body ?? null;
  if (path === 'intro') return copy.intro.map((paragraph) => paragraph.text).join(' ');
  if (path === 'facts') return (copy.facts?.rows ?? []).map((row) => row.value).join(' ');
  return null;
}

export function parseEmailTemplateCopy(
  kind: EmailKind,
  value: unknown,
):
  | { success: true; copy: EmailTemplateCopy; issues: EmailTemplateIssue[] }
  | { success: false; issues: EmailTemplateIssue[] } {
  const parsed = emailTemplateCopySchema.safeParse(value);
  if (!parsed.success) {
    return {
      success: false,
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.map(String).join('.'),
        message: issue.message,
      })),
    };
  }

  return { success: true, copy: parsed.data, issues: emailTemplateIssues(kind, parsed.data) };
}
