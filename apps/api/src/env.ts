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
}

export interface Variables {
  userId?: string;
  role?: Role;
}

export type AppEnv = { Bindings: Env; Variables: Variables };
