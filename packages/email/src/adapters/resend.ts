import type { EmailMessage, EmailProvider } from '../provider';

/** Resend adapter (spec §7.9). Implemented in M1 once the sending domain is set up. */
export function createResendProvider(_apiKey: string): EmailProvider {
  return {
    async send(message: EmailMessage): Promise<void> {
      throw new Error(`Resend provider is not implemented yet (to: ${message.to})`);
    },
  };
}
