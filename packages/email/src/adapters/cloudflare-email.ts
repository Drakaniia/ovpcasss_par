import type { EmailMessage, EmailProvider } from '../provider';

/** Cloudflare Email Service adapter (spec §7.9). Implemented in M1. */
export function createCloudflareEmailProvider(_apiToken: string): EmailProvider {
  return {
    async send(message: EmailMessage): Promise<void> {
      throw new Error(`Cloudflare Email provider is not implemented yet (to: ${message.to})`);
    },
  };
}
