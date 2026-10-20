import type { ReferenceEntityKey } from '@par/shared';
import { eq, isNull, type AnyColumn } from 'drizzle-orm';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';

import type { Database } from '../client';
import {
  refAttachmentRequirements,
  refCampuses,
  refDepartments,
  refOffices,
  refPrograms,
  refSdgs,
  refTerms,
  refUnits,
  type RefAttachmentRequirementRow,
  type RefCampusRow,
  type RefDirectoryRow,
  type RefProgramRow,
  type RefSdgRow,
  type RefTermRow,
  type RefUnitRow,
} from '../schema/reference-data';

export type ReferenceRowMap = {
  campuses: RefCampusRow;
  units: RefUnitRow;
  programs: RefProgramRow;
  departments: RefDirectoryRow;
  offices: RefDirectoryRow;
  sdgs: RefSdgRow;
  terms: RefTermRow;
  'attachment-requirements': RefAttachmentRequirementRow;
};

export type ReferenceRow = ReferenceRowMap[ReferenceEntityKey];

/** A row as the caller supplies it on create; the id and timestamps are included. */
export type ReferenceInsert<E extends ReferenceEntityKey> = Omit<ReferenceRowMap[E], 'deletedAt'>;

const TABLES = {
  campuses: refCampuses,
  units: refUnits,
  programs: refPrograms,
  departments: refDepartments,
  offices: refOffices,
  sdgs: refSdgs,
  terms: refTerms,
  'attachment-requirements': refAttachmentRequirements,
} as const satisfies Record<ReferenceEntityKey, SQLiteTable>;

/**
 * The shared columns every reference table carries, so the four operations can
 * be written once for all eight entities (spec §8). The generic surface above
 * re-narrows the result to the entity's own row type; this structural view is
 * only for the column names the operations need.
 */
type ReferenceTable = SQLiteTable & {
  id: AnyColumn;
  isActive: AnyColumn;
  deletedAt: AnyColumn;
  updatedAt: AnyColumn;
};

function table(entity: ReferenceEntityKey): ReferenceTable {
  return TABLES[entity] as unknown as ReferenceTable;
}

/**
 * Reference-data reads and writes (spec §8). `list` returns active and inactive
 * rows alike and excludes only soft-deleted ones, because the admin page filters
 * the inactive ones itself. `setActive` is the deactivate/activate pair behind
 * `DELETE /ref/:entity/:id` and `POST /ref/:entity/:id/activate`.
 */
export function createReferenceQueries(db: Database) {
  async function findById<E extends ReferenceEntityKey>(
    entity: E,
    id: string,
  ): Promise<ReferenceRowMap[E] | null> {
    const target = table(entity);
    const rows = await db
      .select()
      .from(target)
      .where(eq(target.id, id))
      .limit(1);

    const row = rows[0] as ReferenceRowMap[E] | undefined;
    return row && (row as { deletedAt: string | null }).deletedAt === null ? row : null;
  }

  return {
    async list<E extends ReferenceEntityKey>(entity: E): Promise<ReferenceRowMap[E][]> {
      const target = table(entity);
      const rows = await db.select().from(target).where(isNull(target.deletedAt));

      return rows as unknown as ReferenceRowMap[E][];
    },

    findById,

    async create<E extends ReferenceEntityKey>(
      entity: E,
      values: ReferenceInsert<E>,
    ): Promise<ReferenceRowMap[E]> {
      const target = table(entity);
      await db.insert(target).values(values);

      const created = await findById(entity, (values as { id: string }).id);
      if (!created) throw new Error('Reference row was not persisted');

      return created;
    },

    async update<E extends ReferenceEntityKey>(
      entity: E,
      id: string,
      values: Partial<ReferenceInsert<E>>,
    ): Promise<ReferenceRowMap[E] | null> {
      const target = table(entity);
      await db
        .update(target)
        .set(values)
        .where(eq(target.id, id));

      return findById(entity, id);
    },

    async setActive<E extends ReferenceEntityKey>(
      entity: E,
      id: string,
      isActive: boolean,
      updatedAt: string,
    ): Promise<ReferenceRowMap[E] | null> {
      const target = table(entity);
      await db
        .update(target)
        .set({ isActive, updatedAt } as Partial<ReferenceInsert<E>>)
        .where(eq(target.id, id));

      return findById(entity, id);
    },
  };
}

export type ReferenceQueries = ReturnType<typeof createReferenceQueries>;
