/**
 * The office's identity lives in `@par/shared` so the PDFs and the mail shell
 * read the same lines; this module re-exports it for the mail package and adds
 * the constants that only mail needs.
 */
export {
  OFFICE_ADDRESS_LINES,
  OFFICE_EMAIL_ADDRESS as DEFAULT_OFFICE_EMAIL,
  OFFICE_NAME,
  OFFICE_SHORT_NAME,
  SIGNATURE_LINES,
  SIGNATURE_RULE,
  UNIVERSITY_NAME,
} from '@par/shared';

export const EMAIL_SUBJECT_TAG = '[OVPCASSS PAR]';

export const REPLY_NOTICE =
  'This message was sent by the OVPCASSS Paperless PAR system. Please do not reply.';

/**
 * Mail clients cannot resolve the app's CSS custom properties (email spec §6.2),
 * so the token values are literals here. They mirror `tokens.css`: navy is
 * `--brand-navy-800` and gold is `--brand-gold-600`; `shell.test.ts` holds the
 * documented list.
 */
export const SHELL_COLORS = {
  navy: '#1e2c52',
  gold: '#b8862b',
  ink: '#111827',
  body: '#374151',
  muted: '#6b7280',
  surface: '#f6efdd',
  page: '#ffffff',
} as const;

/** Header band width, in pixels. Fluid below 600 px with 16 px side padding. */
export const SHELL_WIDTH = 600;
