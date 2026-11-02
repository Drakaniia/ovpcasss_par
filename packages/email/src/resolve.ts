import type { EmailTemplateCopy, EmailToken } from '@par/shared';

import type { ShellFact, ShellInput } from './shell';

/**
 * What a kind's copy is resolved against: the values its tokens stand for, the
 * cases its paragraphs can be shown in, and any block the app builds itself (the
 * failure digest's list).
 */
export interface EmailTemplateContext {
  values: Partial<Record<EmailToken, string>>;
  conditions: Record<string, boolean>;
  /** Built by the app when `facts.source` is `failures`. */
  facts?: readonly ShellFact[];
  origin?: string | undefined;
  logoUrl?: string | undefined;
}

const TOKEN_PATTERN = /\{\{([^{}]*)\}\}/g;

/** A missing value renders as nothing, never as `{{token}}` in a mailbox. */
function fill(value: string, context: EmailTemplateContext): string {
  return value.replace(TOKEN_PATTERN, (_match, raw: string) => {
    const token = raw.trim() as EmailToken;
    return context.values[token] ?? '';
  });
}

function actionOf(
  copy: EmailTemplateCopy,
  context: EmailTemplateContext,
): ShellInput['action'] {
  if (!copy.action?.enabled) return undefined;

  const variant = copy.action.variants.find(
    (candidate) => candidate.when === null || context.conditions[candidate.when] === true,
  );
  if (!variant) return undefined;

  const token = variant.urlToken.trim().replace(/^\{\{|\}\}$/g, '').trim() as EmailToken;
  const url = context.values[token] ?? '';
  if (!url) return undefined;

  return { label: fill(variant.label, context), url };
}

function factsOf(
  copy: EmailTemplateCopy,
  context: EmailTemplateContext,
): ShellInput['facts'] {
  if (!copy.facts?.enabled) return undefined;

  if (copy.facts.source === 'failures') {
    return context.facts && context.facts.length > 0 ? context.facts : undefined;
  }

  const rows = copy.facts.rows
    .map((row) => ({ label: fill(row.label, context), value: fill(row.value, context) }))
    .filter((row) => row.value !== '');

  return rows.length > 0 ? rows : undefined;
}

function quoteOf(
  copy: EmailTemplateCopy,
  context: EmailTemplateContext,
): ShellInput['quote'] {
  if (!copy.quote?.enabled) return undefined;

  const body = fill(copy.quote.body, context);
  if (body === '') return undefined;

  return { label: fill(copy.quote.label, context), body };
}

function footerOf(
  copy: EmailTemplateCopy,
  context: EmailTemplateContext,
): Pick<ShellInput, 'reference' | 'note' | 'showReplyNotice'> {
  return {
    ...(copy.footer.enabled
      ? {
          ...(fill(copy.footer.reference, context)
            ? { reference: fill(copy.footer.reference, context) }
            : {}),
          ...(fill(copy.footer.note, context) ? { note: fill(copy.footer.note, context) } : {}),
        }
      : {}),
    showReplyNotice: copy.footer.replyNotice,
  };
}

/**
 * Turn one kind's copy into the shell's input (email message editor spec §4.3).
 * Called by every template with its own context; the built-in copy produces the
 * same message the templates used to hand-write, which the snapshot tests guard.
 */
export function resolveEmailTemplate(
  copy: EmailTemplateCopy,
  context: EmailTemplateContext,
): ShellInput {
  const intro = copy.intro
    .filter((paragraph) => paragraph.when === null || context.conditions[paragraph.when] === true)
    .map((paragraph) => fill(paragraph.text, context))
    .filter((paragraph) => paragraph !== '');

  const facts = factsOf(copy, context);
  const quote = quoteOf(copy, context);
  const action = actionOf(copy, context);

  return {
    subject: fill(copy.subject, context),
    heading: fill(copy.heading, context),
    greeting: copy.greeting,
    intro,
    ...(facts ? { facts } : {}),
    ...(quote ? { quote } : {}),
    ...(action ? { action } : {}),
    ...footerOf(copy, context),
    ...(context.logoUrl ? { logoUrl: context.logoUrl } : {}),
  };
}
