import { ROLES, USER_STATUSES } from '@par/shared';
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

/** Email-token purposes (spec §8). A reset token never verifies an email, and vice versa. */
export const EMAIL_TOKEN_KINDS = ['VERIFY', 'RESET'] as const;
export type EmailTokenKind = (typeof EMAIL_TOKEN_KINDS)[number];

/**
 * One account (spec §8). `email` is stored lowercase and unique so lookups and
 * the allowed-domain check are one comparison. `role` is null until an admin
 * assigns it; `status` drives the sign-in gate. `hash_params` carries the
 * algorithm and work factor with the hash so the policy can be raised later
 * without invalidating existing passwords (spec §7.4).
 *
 * `campus_unit` is free text captured at registration before admin-managed
 * reference data exists (M2); it is resolved to `campus_id`/`unit_id` then.
 */
export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    hashParams: text('hash_params').notNull(),
    /** False while an account has no password of its own (Google sign-in only). */
    hasPassword: integer('has_password', { mode: 'boolean' }).notNull().default(true),
    fullName: text('full_name').notNull(),
    role: text('role', { enum: ROLES }),
    status: text('status', { enum: USER_STATUSES }).notNull(),
    campusId: text('campus_id'),
    unitId: text('unit_id'),
    campusUnit: text('campus_unit'),
    contactNumber: text('contact_number'),
    signatureObjectKey: text('signature_object_key'),
    /** Category mutes (email spec §8). Account and security mail has no column. */
    emailWorkflow: integer('email_workflow', { mode: 'boolean' }).notNull().default(true),
    emailReminders: integer('email_reminders', { mode: 'boolean' }).notNull().default(true),
    emailVerifiedAt: text('email_verified_at'),
    lastSignedInAt: text('last_signed_in_at'),
    deletedAt: text('deleted_at'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('users_email_unique_idx').on(table.email),
    index('users_status_idx').on(table.status),
  ],
);

/**
 * One sign-in session (spec §7.4). Only the token's hash is stored, so a leaked
 * database row cannot be replayed as a session. `last_seen_at` is touched on
 * authenticated requests; expired rows are swept by the cleanup cron.
 */
export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    tokenHash: text('token_hash').notNull(),
    userId: text('user_id').notNull(),
    expiresAt: text('expires_at').notNull(),
    lastSeenAt: text('last_seen_at').notNull(),
    userAgent: text('user_agent'),
    ip: text('ip'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('sessions_token_hash_unique_idx').on(table.tokenHash),
    index('sessions_user_idx').on(table.userId),
  ],
);

/**
 * Single-use verify/reset tokens (spec §7.4). The plaintext token only ever
 * travels in the email link; the row keeps its hash, an expiry, and the moment
 * it was spent. `used_at` is the single-use guard.
 */
export const emailTokens = sqliteTable(
  'email_tokens',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    kind: text('kind', { enum: EMAIL_TOKEN_KINDS }).notNull(),
    tokenHash: text('token_hash').notNull(),
    expiresAt: text('expires_at').notNull(),
    usedAt: text('used_at'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('email_tokens_token_hash_unique_idx').on(table.tokenHash),
    index('email_tokens_user_kind_idx').on(table.userId, table.kind),
  ],
);
