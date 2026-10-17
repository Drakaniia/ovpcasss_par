export { createCloudflareEmailProvider } from './adapters/cloudflare-email';
export { createResendProvider } from './adapters/resend';
export type { EmailContent, EmailMessage, EmailProvider, EmailProviderKind } from './provider';
export * from './templates/account-events';
export * from './templates/report-events';
