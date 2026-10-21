import type { EmailProviderKind } from '@par/email';
import type { Role } from '@par/shared';

export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  EMAIL_QUEUE: Queue;
  ALLOWED_EMAIL_DOMAINS: string;
  /** Comma-separated addresses that become an active Admin once verified. */
  BOOTSTRAP_ADMIN_EMAILS?: string;
  EMAIL_PROVIDER: EmailProviderKind;
  /** Verified sender for outbound mail; the sending domain is spec §14 Q15. */
  EMAIL_FROM: string;
  SESSION_SECRET: string;
  R2_ACCOUNT_ID: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  /** Bucket name for the S3-compatible presign endpoint; defaults to the dev bucket. */
  R2_BUCKET_NAME?: string;
  EMAIL_API_KEY: string;
  /** Optional Google OAuth client; the Google button is hidden until both are set. */
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;

  /** The office mailbox: workbook default recipient and the digest fallback. */
  OFFICE_EMAIL?: string;
  /**
   * The deployed app's origin, used by mail composed outside a request (the
   * reminder sweep and the failure digest). Request-driven mail uses the
   * request's own origin, so this is only needed for cron.
   */
  APP_ORIGIN?: string;
  /** Working-day threshold before a reminder; defaults to the queue's 3. */
  REMINDER_AFTER_WORKING_DAYS?: string;
  /** Manila hour at which the daily reminder sweep sends; defaults to 9. */
  REMINDER_LOCAL_HOUR?: string;
  /** Total attachment budget per message; defaults to 8 MiB. */
  EMAIL_MAX_ATTACHMENT_BYTES?: string;
  /** Mounts the dev-only rendered preview of every template. Never set in production. */
  DEV_EMAIL_PREVIEW?: string;
}

export interface Variables {
  userId?: string;
  role?: Role;
}

export type AppEnv = { Bindings: Env; Variables: Variables };
