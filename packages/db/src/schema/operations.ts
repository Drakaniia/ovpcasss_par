import { ROLES } from '@par/shared';
import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * The audit trail (spec §7.12, §8). Append-only by design: there is no update
 * or delete path in the schema or the queries, and the table deliberately has
 * no `updated_at` because a row is written once and never changes.
 *
 * `action` is the office's own term (`REGISTER`, `LOGIN_FAILED`,
 * `ROLE_ASSIGNED`, …); `entity_type`/`entity_id` say what it happened to.
 * Returned columns carry the status before and after so the timeline needs no
 * joins. IP and user agent are recorded for security review.
 */
export const auditEvents = sqliteTable(
  'audit_events',
  {
    id: text('id').primaryKey(),
    actorUserId: text('actor_user_id'),
    actorRole: text('actor_role', { enum: ROLES }),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id'),
    fromStatus: text('from_status'),
    toStatus: text('to_status'),
    comment: text('comment'),
    ip: text('ip'),
    userAgent: text('user_agent'),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    index('audit_events_entity_idx').on(table.entityType, table.entityId, table.createdAt),
    index('audit_events_created_idx').on(table.createdAt),
  ],
);

export const EMAIL_OUTBOX_STATUSES = ['QUEUED', 'SENT', 'FAILED', 'SUPPRESSED'] as const;
export type EmailOutboxStatus = (typeof EMAIL_OUTBOX_STATUSES)[number];

/**
 * Visibility into queued and failed mail (spec §7.9, email spec §9). The Queue
 * is the delivery path; this table exists so the admin inbox and the email log
 * can show failures the Queue swallowed. `attempts` is written by the consumer.
 *
 * `payload` is metadata only — `{ subject, reportId, attachments, note }` — never
 * a rendered body, so a row cannot leak the message it describes. `last_error`
 * holds the delivery error, or the suppression reason when the status is
 * `SUPPRESSED` (muted recipient, disabled account, actor, missing facts).
 */
export const emailOutbox = sqliteTable(
  'email_outbox',
  {
    id: text('id').primaryKey(),
    kind: text('kind').notNull(),
    to: text('to').notNull(),
    payload: text('payload').notNull(),
    status: text('status', { enum: EMAIL_OUTBOX_STATUSES }).notNull(),
    attempts: integer('attempts').notNull().default(0),
    lastError: text('last_error'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [index('email_outbox_status_idx').on(table.status)],
);

/**
 * Idempotency for retried submits (spec §7.2). The key is scoped by the user
 * who sent it; the stored response is replayed when the same key returns, so a
 * flaky connection cannot create a second report.
 */
export const idempotencyKeys = sqliteTable('idempotency_keys', {
  key: text('key').primaryKey(),
  userId: text('user_id').notNull(),
  requestHash: text('request_hash').notNull(),
  response: text('response').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

/**
 * Fixed-window brute-force counters (spec §7.4). One row per `bucket` per
 * `window_start`; an attempt increments the row and the route compares the
 * count to its own limit. Chosen over the Workers rate-limiting binding because
 * a D1 counter is durable across isolates and testable without a live binding.
 */
export const rateLimitCounters = sqliteTable(
  'rate_limit_counters',
  {
    bucket: text('bucket').notNull(),
    windowStart: text('window_start').notNull(),
    count: integer('count').notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.bucket, table.windowStart] })],
);
