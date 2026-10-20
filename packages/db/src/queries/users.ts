import type { Role, UserStatus } from '@par/shared';
import { and, asc, desc, eq, isNull, like, or, sql, type SQL } from 'drizzle-orm';

import type { Database } from '../client';
import { users } from '../schema/identity';

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;

export interface UserListFilter {
  q?: string;
  role?: Role;
  status?: UserStatus;
  sort: 'name' | 'registered';
  dir: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

export interface UserListPage {
  rows: UserRow[];
  total: number;
}

/** Soft-deleted accounts never appear in the directory or sign-in lookups. */
function alive(condition?: SQL): SQL {
  return condition ? and(isNull(users.deletedAt), condition)! : isNull(users.deletedAt)!;
}

/**
 * User reads and writes (spec §8, §9). The SQL lives beside the schema so the
 * column names have one owner; the API maps these rows into its own shapes and
 * enforces the workflow rules (who may change whose role).
 */
export function createUserQueries(db: Database) {
  return {
    async insert(row: NewUserRow): Promise<void> {
      await db.insert(users).values(row);
    },

    async findByEmail(email: string): Promise<UserRow | null> {
      const rows = await db
        .select()
        .from(users)
        .where(alive(eq(users.email, email)))
        .limit(1);
      return rows[0] ?? null;
    },

    async findById(id: string): Promise<UserRow | null> {
      const rows = await db
        .select()
        .from(users)
        .where(alive(eq(users.id, id)))
        .limit(1);
      return rows[0] ?? null;
    },

    async list(filter: UserListFilter): Promise<UserListPage> {
      const term = filter.q?.trim();
      const condition = alive(
        and(
          filter.role ? eq(users.role, filter.role) : undefined,
          filter.status ? eq(users.status, filter.status) : undefined,
          term ? or(like(users.fullName, `%${term}%`), like(users.email, `%${term}%`)) : undefined,
        ),
      );

      const order = filter.sort === 'name' ? users.fullName : users.createdAt;
      const direction = filter.dir === 'asc' ? asc : desc;

      const [rows, total] = await Promise.all([
        db
          .select()
          .from(users)
          .where(condition)
          .orderBy(direction(order))
          .limit(filter.pageSize)
          .offset((filter.page - 1) * filter.pageSize),
        db
          .select({ value: sql<number>`count(*)` })
          .from(users)
          .where(condition)
          .then((result) => Number(result[0]?.value ?? 0)),
      ]);

      return { rows, total };
    },

    /** Active recipients for a role, used by the workflow notifications. */
    async listActiveByRole(role: Role): Promise<UserRow[]> {
      return db
        .select()
        .from(users)
        .where(alive(and(eq(users.role, role), eq(users.status, 'ACTIVE'))))
        .orderBy(asc(users.fullName));
    },

    async countByStatus(status: UserStatus): Promise<number> {
      const rows = await db
        .select({ value: sql<number>`count(*)` })
        .from(users)
        .where(alive(eq(users.status, status)));

      return Number(rows[0]?.value ?? 0);
    },

    /** Applies a partial update and returns the fresh row, or null when it is gone. */
    async update(id: string, patch: Partial<NewUserRow>, at: string): Promise<UserRow | null> {
      await db
        .update(users)
        .set({ ...patch, updatedAt: at })
        .where(alive(eq(users.id, id)));

      const rows = await db
        .select()
        .from(users)
        .where(alive(eq(users.id, id)))
        .limit(1);
      return rows[0] ?? null;
    },
  };
}

export type UserQueries = ReturnType<typeof createUserQueries>;
