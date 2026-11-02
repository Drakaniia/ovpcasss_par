import { z } from 'zod';

import { emailSchema } from './auth';

/**
 * The office's receipt signatory (report 9). The name and position print in the
 * closing block of every new OVPCASSS-F-013. Once a receipt PDF has been
 * rendered it is never rewritten, so a change here reaches only receipts issued
 * after it.
 */
export const DEFAULT_RECEIPT_SIGNATORY = {
  name: 'DR. LINCOLN V. TAN',
  title: 'VPCASSS',
} as const;

export const receiptSignatorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Enter the name that signs the receipt.')
    .max(80, 'Keep the name under 80 characters.'),
  title: z
    .string()
    .trim()
    .min(1, 'Enter the position under the name.')
    .max(80, 'Keep the position under 80 characters.'),
});
export type ReceiptSignatory = z.infer<typeof receiptSignatorySchema>;

export const receiptSignatoryResponseSchema = z.object({ signatory: receiptSignatorySchema });
export type ReceiptSignatoryResponse = z.infer<typeof receiptSignatoryResponseSchema>;

/**
 * The sender outbound mail is built from. The administrator's saved row wins
 * over the Worker variables `EMAIL_FROM` and `EMAIL_API_KEY`; a blank key on
 * the form keeps the key that is already saved.
 */
export const emailSenderSchema = z.object({
  from: z
    .string()
    .trim()
    .min(3, 'Enter the sending address.')
    .max(200, 'Keep the sending address under 200 characters.'),
  /** Absent only on a half-saved row, which the resolver ignores. */
  apiKey: z.string().trim().min(1).max(400).optional(),
});
export type EmailSender = z.infer<typeof emailSenderSchema>;

export const emailSenderInputSchema = z.object({
  from: z
    .string()
    .trim()
    .min(3, 'Enter the sending address.')
    .max(200, 'Keep the sending address under 200 characters.')
    .refine((value) => value.includes('@'), 'Enter a sending address with an @.'),
  /** Blank leaves the saved key in place. */
  apiKey: z.string().trim().max(400, 'Keep the API key under 400 characters.').optional(),
});
export type EmailSenderInput = z.infer<typeof emailSenderInputSchema>;

/** The adapters the Worker can select; `console` prints instead of delivering. */
export const EMAIL_PROVIDER_KINDS = ['brevo', 'resend', 'cloudflare', 'console'] as const;

export const emailSenderResponseSchema = z.object({
  from: z.string(),
  apiKeySet: z.boolean(),
  /** Last four characters of the key in use, or empty when none is set. */
  apiKeyHint: z.string(),
  /** Which store the values in effect are read from. */
  source: z.enum(['database', 'environment']),
  /**
   * The adapter the deployment selects (a Worker variable, not a setting here).
   * Only a real provider reads the saved key: `console` prints every message, so
   * the page names it instead of letting a test message look broken.
   */
  provider: z.enum(EMAIL_PROVIDER_KINDS),
});
export type EmailSenderResponse = z.infer<typeof emailSenderResponseSchema>;

/**
 * The variables page's test message (email spec §9.6). One address, sent through
 * the saved sending address and key, so a replacement key is proven before the
 * next workflow transition depends on it.
 */
export const emailTestInputSchema = z.object({
  to: z.preprocess((value) => (typeof value === 'string' ? value.trim() : value), emailSchema),
});
export type EmailTestInput = z.infer<typeof emailTestInputSchema>;

/** `provider` names the adapter that carried the test, so the page can say which. */
export const emailTestResponseSchema = z.object({
  to: z.string(),
  provider: z.enum(EMAIL_PROVIDER_KINDS),
});
export type EmailTestResponse = z.infer<typeof emailTestResponseSchema>;
