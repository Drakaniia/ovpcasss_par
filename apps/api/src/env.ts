import type { EmailProviderKind } from '@par/email';
import type { Role } from '@par/shared';

export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  EMAIL_QUEUE: Queue;
  ALLOWED_EMAIL_DOMAINS: string;
  EMAIL_PROVIDER: EmailProviderKind;
  SESSION_SECRET: string;
  R2_ACCOUNT_ID: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  EMAIL_API_KEY: string;
}

export interface Variables {
  userId?: string;
  role?: Role;
}

export type AppEnv = { Bindings: Env; Variables: Variables };
