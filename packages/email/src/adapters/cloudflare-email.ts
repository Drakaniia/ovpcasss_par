import type { EmailProvider } from '../provider';

/**
 * Cloudflare Email Service adapter — deliberately unimplemented (email spec D5).
 * Resend is the launch provider; this stays a stub so the selection branch is
 * already in place. If it is finished, note that the service caps a message at
 * 5 MiB total, well under the 8 MiB worker budget, so the attachment cap must be
 * applied before handing bytes to this adapter.
 */
export function createCloudflareEmailProvider(_apiKey: string): EmailProvider {
  return {
    async send(): Promise<void> {
      throw new Error('The Cloudflare Email Service adapter is not implemented. Use Resend.');
    },
  };
}
