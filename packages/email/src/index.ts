export { createBrevoProvider } from './adapters/brevo';
export { createCloudflareEmailProvider } from './adapters/cloudflare-email';
export { createConsoleProvider } from './adapters/console';
export { createResendProvider } from './adapters/resend';
export {
  manilaDate,
  manilaDateTime,
  manilaLongDate,
  pluralDays,
  semesterLabel,
  sheetLabel,
} from './format';
export {
  DEFAULT_OFFICE_EMAIL,
  EMAIL_SUBJECT_TAG,
  OFFICE_ADDRESS_LINES,
  OFFICE_NAME,
  OFFICE_SHORT_NAME,
  REPLY_NOTICE,
  SHELL_COLORS,
  SHELL_WIDTH,
  SIGNATURE_LINES,
  SIGNATURE_RULE,
  UNIVERSITY_NAME,
} from './identity';
export type {
  EmailAttachment,
  EmailAttachmentRef,
  EmailContent,
  EmailKind,
  EmailMessage,
  EmailProvider,
  EmailProviderKind,
} from './provider';
export { SAMPLE_ORIGIN, emailSamples, sampleFor, type EmailSample } from './samples';
export {
  escapeHtml,
  renderShell,
  wrapText,
  type ShellAction,
  type ShellFact,
  type ShellInput,
  type ShellQuote,
} from './shell';
export * from './templates/account-events';
export * from './templates/operations';
export * from './templates/narrative-events';
