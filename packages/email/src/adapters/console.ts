import type { EmailMessage, EmailProvider } from '../provider';

function kilobytes(bytes: number): string {
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Local-development adapter: prints the composed message, its attachments, and
 * any link it carries to the `wrangler dev` console. Selected explicitly with
 * `EMAIL_PROVIDER=console`; never used unless configured.
 */
export function createConsoleProvider(): EmailProvider {
  return {
    async send(message: EmailMessage): Promise<void> {
      const attachments = (message.attachments ?? [])
        .map(
          (attachment) =>
            `\n[email:console] attachment=${attachment.filename} (${kilobytes(attachment.content.length)})`,
        )
        .join('');

      console.log(
        `[email:console] to=${message.to} subject=${message.subject}${attachments}\n${message.text}`,
      );
    },
  };
}
