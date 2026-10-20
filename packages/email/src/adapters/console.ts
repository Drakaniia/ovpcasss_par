import type { EmailMessage, EmailProvider } from '../provider';

/**
 * Local-development adapter: prints the composed message (and any link it
 * carries) to the `wrangler dev` console. Selected explicitly with
 * `EMAIL_PROVIDER=console`; never used unless configured.
 */
export function createConsoleProvider(): EmailProvider {
  return {
    async send(message: EmailMessage): Promise<void> {
      console.log(
        `[email:console] to=${message.to} subject=${message.subject}\n${message.text}`,
      );
    },
  };
}
