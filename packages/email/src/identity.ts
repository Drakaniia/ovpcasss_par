import { OFFICE_EMAIL_ADDRESS } from '@par/shared';

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

/**
 * Every message carries a `Reply-To` at the office mailbox (the sending address
 * is often a test address), so the footer says where a reply lands instead of
 * asking the reader not to send one.
 */
export const REPLY_NOTICE = `This message was sent by the OVPCASSS Paperless PAR system. Replies reach the OVPCASSS office at ${OFFICE_EMAIL_ADDRESS}.`;

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

/**
 * The header logo. The web build is the only host every recipient can reach, so
 * the shell takes the message's own origin and points at this file there
 * (email spec §6.2). A mail client that blocks remote images shows the alt text.
 */
export const EMAIL_LOGO_PATH = '/brand/ovpcasss-logo-email.png';

/** Display size in CSS pixels; the asset is 360 × 120 for high-density screens. */
export const EMAIL_LOGO_WIDTH = 180;
export const EMAIL_LOGO_HEIGHT = 60;

/** Absolute logo URL, or `undefined` when the app's origin is unknown. */
export function logoUrl(origin: string | undefined): string | undefined {
  return origin ? `${origin}${EMAIL_LOGO_PATH}` : undefined;
}
