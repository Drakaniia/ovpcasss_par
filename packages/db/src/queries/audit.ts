import type { AdminAuditListQuery, AuditQuery } from '@par/shared';
import { and, asc, desc, eq, gte, like, lte, or, sql, type SQL } from 'drizzle-orm';

import type { Database } from '../client';
import { auditEvents } from '../schema/operations';

export type AuditEventRow = typeof auditEvents.$inferSelect;
export type NewAuditEventRow = typeof auditEvents.$inferInsert;

/**
 * The audit trail is append-only (spec §7.12): only `insert` and reads exist,
 * and there is deliberately no update or delete here. Every call is a bare
 * insert; nothing else in the system may mutate these rows.
 */
export function createAuditQueries(db: Database) {
  return {
    async insert(row: NewAuditEventRow): Promise<void> {
      await db.insert(auditEvents).values(row);
    },

    async findById(id: string): Promise<AuditEventRow | null> {
      const rows = await db.select().from(auditEvents).where(eq(auditEvents.id, id)).limit(1);
      return rows[0] ?? null;
    },

    async list(query: AuditQuery): Promise<AuditEventRow[]> {
      const conditions: SQL[] = [];
      if (query.entityId) conditions.push(eq(auditEvents.entityId, query.entityId));
      if (query.actorId) conditions.push(eq(auditEvents.actorUserId, query.actorId));
      if (query.from) conditions.push(gte(auditEvents.createdAt, query.from));
      if (query.to) conditions.push(lte(auditEvents.createdAt, query.to));

      return db
        .select()
        .from(auditEvents)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(auditEvents.createdAt))
        .limit(query.limit);
    },

    async listFiltered(query: AdminAuditListQuery): Promise<{ rows: AuditEventRow[]; total: number }> {
      const conditions: SQL[] = [];
      if (query.entityId) conditions.push(eq(auditEvents.entityId, query.entityId));
      if (query.entityType) conditions.push(eq(auditEvents.entityType, query.entityType));
      if (query.action) conditions.push(eq(auditEvents.action, query.action));
      if (query.fromStatus) conditions.push(eq(auditEvents.fromStatus, query.fromStatus));
      if (query.toStatus) conditions.push(eq(auditEvents.toStatus, query.toStatus));
      if (query.from) conditions.push(gte(auditEvents.createdAt, query.from));
      if (query.to) conditions.push(lte(auditEvents.createdAt, query.to));
      if (query.actor) {
        const actorTerm = query.actor.trim();
        conditions.push(
          or(
            eq(auditEvents.actorUserId, actorTerm),
            like(auditEvents.actorRole, `%${actorTerm}%`),
            like(auditEvents.comment, `%${actorTerm}%`),
          )!,
        );
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const limit = query.limit ?? 50;
      const page = query.page ?? 1;
      const offset = (page - 1) * limit;

      const [rows, total] = await Promise.all([
        db
          .select()
          .from(auditEvents)
          .where(where)
          .orderBy(desc(auditEvents.createdAt))
          .limit(limit)
          .offset(offset),
        db
          .select({ value: sql<number>`count(*)` })
          .from(auditEvents)
          .where(where)
          .then((result) => Number(result[0]?.value ?? 0)),
      ]);

      return { rows, total };
    },

    /** One report's timeline, oldest first, for the facsimile history. */
    async listForEntity(entityType: string, entityId: string): Promise<AuditEventRow[]> {
      return db
        .select()
        .from(auditEvents)
        .where(
          and(eq(auditEvents.entityType, entityType), eq(auditEvents.entityId, entityId)),
        )
        .orderBy(asc(auditEvents.createdAt));
    },

    /** The admin inbox shows the newest few; newest first. */
    async listRecent(limit: number): Promise<AuditEventRow[]> {
      return db.select().from(auditEvents).orderBy(desc(auditEvents.createdAt)).limit(limit);
    },
  };
}

export type AuditQueries = ReturnType<typeof createAuditQueries>;
