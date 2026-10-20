import { createAuditQueries, createDb, type AuditEventRow } from '@par/db';
import type { AdminAuditListQuery, AdminAuditListResponse, AuditEventItem } from '@par/shared';
import type { Context } from 'hono';

import type { AppEnv } from '../../../env';

function mapRowToItem(row: AuditEventRow): AuditEventItem {
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
    createdAt: row.createdAt,
  };
}

export async function listAuditEvents(
  c: Context<AppEnv>,
  query: AdminAuditListQuery,
): Promise<AdminAuditListResponse> {
  const db = createDb(c.env.DB);
  const audit = createAuditQueries(db);

  const { rows, total } = await audit.listFiltered(query);

  return {
    items: rows.map(mapRowToItem),
    total,
    page: query.page ?? 1,
    pageSize: query.limit ?? 50,
  };
}
