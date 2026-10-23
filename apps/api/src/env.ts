import type { EmailProviderKind } from '@par/email';
import type { Role } from '@par/shared';

export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  EMAIL_QUEUE: Queue;
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
   * The address the browser uses for the app, which is the Pages site; the API
   * is reached through its `/api/*` proxy, so a request's own URL names the
   * Worker instead. Links in mail, receipts, and the Google redirect URI use
   * this value, and the cron mail has no request to read. Unset locally, where
   * the request origin is the web build on :5173.
   */
  APP_ORIGIN?: string;
  /**
   * Shared secret with the Pages Function that fronts this API. A request that
   * presents it is treated as same-origin and may name the browser's address;
   * absent, both behaviours stay off (spec §7.1, §10).
   */
  PROXY_TOKEN?: string;
  /**
   * Optional address lookup for the location field (bug phase 04 §3.2). The
   * template takes `{q}` for the encoded query and `{key}` for the secret; with
   * it unset the field offers only locations the office already used.
   */
  LOCATION_SUGGEST_URL?: string;
  /** Provider key, sent in the template or as a bearer header; never a client value. */
  LOCATION_SUGGEST_KEY?: string;
  /** Fixed signatory block on the OVPCASSS-F-013 receipt (spec §10.1). */
  RECEIPT_SIGNATORY_NAME?: string;
  RECEIPT_SIGNATORY_TITLE?: string;
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
