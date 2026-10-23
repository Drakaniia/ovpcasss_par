import {
  EMAIL_SUBJECT_TAG,
  OFFICE_NAME,
  OFFICE_SHORT_NAME,
  REPLY_NOTICE,
  SHELL_COLORS,
  SHELL_WIDTH,
  SIGNATURE_LINES,
  SIGNATURE_RULE,
} from './identity';
import type { EmailContent } from './provider';

/**
 * The one shell every message is built on (email spec §6). Tables and inline
 * styles only: mail clients are not browsers, and the desktop build must work
 * offline, so there is no stylesheet, web font, image, or tracking URL.
 */
export interface ShellFact {
  label: string;
  value: string;
}

export interface ShellQuote {
  label: string;
  body: string;
}

export interface ShellAction {
  label: string;
  url: string;
}

export interface ShellInput {
  subject: string;
  /** The one h1; a sentence, never a fragment. */
  heading: string;
  intro: readonly string[];
  facts?: readonly ShellFact[] | undefined;
  quote?: ShellQuote | undefined;
  action?: ShellAction | undefined;
  /** AR No. or term, printed in the footer. */
  reference?: string | undefined;
  /** Extra footer line, e.g. "The document is available in the app." */
  note?: string | undefined;
}

const FONT = "Montserrat, 'Segoe UI', Helvetica, Arial, sans-serif";

/** All interpolated values go through this (email spec §6.6). */
export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** HTML keeps the author's line breaks; comments are written by a person. */
function htmlText(value: string): string {
  return escapeHtml(value).replaceAll('\n', '<br>');
}

/** Greedy wrap at `width`; a word longer than the line keeps its own line. */
export function wrapText(value: string, width = 72): string[] {
  const lines: string[] = [];

  for (const paragraph of value.split('\n')) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push('');
      continue;
    }

    let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (current && candidate.length > width) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    lines.push(current);
  }

  return lines;
}

function factsHtml(facts: readonly ShellFact[]): string {
  const rows = facts
    .map(
      (fact) =>
        `<tr>` +
        `<td style="padding:6px 0;font:600 12px/18px ${FONT};color:${SHELL_COLORS.muted};vertical-align:top;width:38%;">${escapeHtml(fact.label)}</td>` +
        `<td style="padding:6px 0;font:400 13px/18px ${FONT};color:${SHELL_COLORS.ink};">${htmlText(fact.value)}</td>` +
        `</tr>`,
    )
    .join('');

  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ` +
    `style="border-collapse:collapse;margin:0 0 20px;">${rows}</table>`
  );
}

function quoteHtml(quote: ShellQuote): string {
  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ` +
    `style="border-collapse:collapse;margin:0 0 20px;background:${SHELL_COLORS.surface};">` +
    `<tr><td style="width:3px;background:${SHELL_COLORS.gold};font-size:0;line-height:0;">&nbsp;</td>` +
    `<td style="padding:12px 16px;">` +
    `<div style="font:600 12px/18px ${FONT};color:${SHELL_COLORS.muted};margin:0 0 6px;">${escapeHtml(quote.label)}</div>` +
    `<div style="font:400 13px/20px ${FONT};color:${SHELL_COLORS.ink};">${htmlText(quote.body)}</div>` +
    `</td></tr></table>`
  );
}

function actionHtml(action: ShellAction): string {
  return (
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:0 0 24px;">` +
    `<tr><td style="background:${SHELL_COLORS.navy};padding:10px 18px;">` +
    `<a href="${escapeHtml(action.url)}" style="font:600 13px/18px ${FONT};color:#ffffff;text-decoration:none;">${escapeHtml(action.label)}</a>` +
    `</td></tr></table>`
  );
}

function signatureHtml(): string {
  const [university, office, ...address] = SIGNATURE_LINES;

  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:8px 0 0;">` +
    `<tr><td style="border-top:1px solid #d1d5db;padding:12px 0 0;font:400 12px/18px ${FONT};color:${SHELL_COLORS.muted};">${SIGNATURE_RULE}</td></tr>` +
    `<tr><td style="font:600 12px/18px ${FONT};color:${SHELL_COLORS.ink};padding-top:4px;">${escapeHtml(university ?? '')}</td></tr>` +
    `<tr><td style="font:600 12px/18px ${FONT};color:${SHELL_COLORS.ink};">${escapeHtml(office ?? '')}</td></tr>` +
    address
      .map(
        (line) =>
          `<tr><td style="font:400 12px/18px ${FONT};color:${SHELL_COLORS.body};">${escapeHtml(line)}</td></tr>`,
      )
      .join('') +
    `</table>`
  );
}

function footerHtml(input: ShellInput): string {
  const lines = [input.reference, input.note, REPLY_NOTICE].filter((line): line is string =>
    Boolean(line),
  );

  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:20px 0 0;">` +
    lines
      .map(
        (line) =>
          `<tr><td style="font:400 11px/16px ${FONT};color:${SHELL_COLORS.muted};padding-top:4px;">${escapeHtml(line)}</td></tr>`,
      )
      .join('') +
    `</table>`
  );
}

function html(input: ShellInput): string {
  const paragraphs = input.intro
    .map(
      (paragraph) =>
        `<p style="margin:0 0 12px;font:400 14px/22px ${FONT};color:${SHELL_COLORS.ink};">${htmlText(paragraph)}</p>`,
    )
    .join('');

  const preheader = input.intro[0] ?? input.heading;

  return (
    `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<title>${escapeHtml(input.subject)}</title></head>` +
    `<body style="margin:0;padding:0;background:#f4f4f5;">` +
    `<div style="display:none;font-size:1px;color:#f4f4f5;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(preheader)}</div>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;background:#f4f4f5;">` +
    `<tr><td align="center" style="padding:24px 16px;">` +
    `<table role="presentation" width="${SHELL_WIDTH}" cellpadding="0" cellspacing="0" border="0" ` +
    `style="width:100%;max-width:${SHELL_WIDTH}px;border-collapse:collapse;background:${SHELL_COLORS.page};">` +
    `<tr><td style="background:${SHELL_COLORS.navy};padding:20px 24px;">` +
    `<div style="font:600 12px/16px ${FONT};color:#ffffff;letter-spacing:2px;">${OFFICE_SHORT_NAME}</div>` +
    `<div style="font:400 13px/18px ${FONT};color:#ffffff;padding-top:4px;">${escapeHtml(OFFICE_NAME)}</div>` +
    `</td></tr>` +
    `<tr><td style="height:3px;background:${SHELL_COLORS.gold};font-size:0;line-height:0;">&nbsp;</td></tr>` +
    `<tr><td style="padding:24px;">` +
    `<h1 style="margin:0 0 16px;font:600 18px/26px ${FONT};color:${SHELL_COLORS.navy};">${escapeHtml(input.heading)}</h1>` +
    `<p style="margin:0 0 12px;font:400 14px/22px ${FONT};color:${SHELL_COLORS.ink};">Good day.</p>` +
    paragraphs +
    (input.facts && input.facts.length > 0 ? factsHtml(input.facts) : '') +
    (input.quote ? quoteHtml(input.quote) : '') +
    (input.action ? actionHtml(input.action) : '') +
    signatureHtml() +
    footerHtml(input) +
    `</td></tr></table></td></tr></table></body></html>`
  );
}

function text(input: ShellInput): string {
  const parts: string[] = ['Good day.', ''];

  for (const paragraph of input.intro) {
    parts.push(...wrapText(paragraph), '');
  }

  for (const fact of input.facts ?? []) {
    parts.push(...wrapText(`${fact.label}: ${fact.value}`), '');
  }

  if (input.quote) {
    parts.push(...wrapText(input.quote.label), '');
    for (const line of input.quote.body.split('\n')) {
      parts.push(...wrapText(`> ${line}`), '');
    }
  }

  if (input.action) {
    parts.push(wrapText(input.action.label)[0] ?? input.action.label, input.action.url, '');
  }

  parts.push(SIGNATURE_RULE, ...SIGNATURE_LINES, '');

  if (input.reference) parts.push(input.reference, '');
  if (input.note) parts.push(...wrapText(input.note), '');
  parts.push(...wrapText(REPLY_NOTICE));

  return parts
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd();
}

/** The subject is assembled here so no template can forget the tag (§6.4). */
export function renderShell(input: ShellInput): EmailContent {
  const subject = `${EMAIL_SUBJECT_TAG} ${input.subject}`.trim();
  return { subject, html: html({ ...input, subject }), text: text(input) };
}
