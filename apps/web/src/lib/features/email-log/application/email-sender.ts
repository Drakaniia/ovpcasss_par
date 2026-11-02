import { emailSenderInputSchema, type EmailSenderInput, type EmailTestResponse } from '@par/shared';

export interface EmailSenderDraft {
  from: string;
  apiKey: string;
}

export const EMPTY_SENDER_DRAFT: EmailSenderDraft = { from: '', apiKey: '' };

/** Display names for the adapter in use, so the page can name who carried a test. */
export const EMAIL_PROVIDER_LABELS: Record<EmailTestResponse['provider'], string> = {
  brevo: 'Brevo',
  resend: 'Resend',
  cloudflare: 'Cloudflare Email',
  console: 'the console adapter',
};

/**
 * The test message sends what is saved, so a pending edit is reported instead of
 * quietly proving a configuration that is not live.
 */
export function hasUnsavedSenderChanges(draft: EmailSenderDraft, savedFrom: string): boolean {
  return draft.apiKey.trim() !== '' || draft.from.trim() !== savedFrom.trim();
}

/**
 * The sender form (email variables). A blank key keeps the saved one, so it is
 * only an error when there is nothing to keep yet.
 */
export function validateSenderDraft(
  draft: EmailSenderDraft,
  keySaved: boolean,
): { errors: Record<string, string>; input: EmailSenderInput | null } {
  const errors: Record<string, string> = {};
  const apiKey = draft.apiKey.trim();

  const parsed = emailSenderInputSchema.safeParse({
    from: draft.from.trim(),
    ...(apiKey ? { apiKey } : {}),
  });

  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? 'from');
      if (!errors[field]) errors[field] = issue.message;
    }
  }

  if (!keySaved && !apiKey) errors.apiKey = 'Enter the API key.';

  return {
    errors,
    input: Object.keys(errors).length === 0 && parsed.success ? parsed.data : null,
  };
}
