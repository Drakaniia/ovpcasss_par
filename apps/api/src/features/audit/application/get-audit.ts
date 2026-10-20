import { createAuditQueries, createDb, type AuditQueries } from '@par/db';
import type { AuditEventDetail } from '@par/shared';
import type { Context } from 'hono';

import type { AppEnv } from '../../../env';

const FORBIDDEN_KEY_PATTERN = /(password|hash|token|secret|signature|signed_?url)/i;

export function redactObject(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (FORBIDDEN_KEY_PATTERN.test(key)) {
      result[key] = '[redacted]';
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = redactObject(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export function parsePayload(comment: string | null | undefined): {
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
} {
  if (!comment) return {};
  try {
    const parsed = JSON.parse(comment);
    if (parsed && typeof parsed === 'object') {
      const before = parsed.before ? redactObject(parsed.before) : undefined;
      const after = parsed.after ? redactObject(parsed.after) : undefined;
      return { ...(before ? { before } : {}), ...(after ? { after } : {}) };
    }
  } catch {
    // comment is a plain text note, not JSON
  }
  return {};
}

export async function getAuditEvent(
  c: Context<AppEnv>,
  id: string,
  queries?: AuditQueries,
): Promise<AuditEventDetail | null> {
  const audit = queries ?? createAuditQueries(createDb(c.env.DB));

  const row = await audit.findById(id);
  if (!row) return null;

  const { before, after } = parsePayload(row.comment);

  return {
    id: row.id,
    actorUserId: row.actorUserId,
    actorRole: row.actorRole,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    entityLabel: row.entityId ?? undefined,
    fromStatus: row.fromStatus,
    toStatus: row.toStatus,
    comment: row.comment,
    ip: row.ip,
    userAgent: row.userAgent,
    requestId: row.id,
    createdAt: row.createdAt,
    before: before ?? null,
    after: after ?? null,
  };
}
