export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

export interface EmailMessage extends EmailContent {
  to: string;
}

/** Adapter port for the outbound queue worker (spec §7.9). Chosen by env var. */
export interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}

export type EmailProviderKind = 'resend' | 'cloudflare';
