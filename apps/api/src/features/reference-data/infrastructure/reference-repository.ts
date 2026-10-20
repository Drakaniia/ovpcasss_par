import {
  createReferenceQueries,
  type Database,
  type ReferenceRow,
  type ReferenceRowMap,
} from '@par/db';
import { seedReferenceData } from '@par/db/seed';
import type { ReferenceEntityKey, ReferenceEntry } from '@par/shared';

import {
  toAttachmentRequirementEntry,
  toCampusEntry,
  toDirectoryEntry,
  toProgramEntry,
  toSdgEntry,
  toTermEntry,
  toUnitEntry,
} from '../domain/reference-entry';

type CampusRow = ReferenceRowMap['campuses'];
type UnitRow = ReferenceRowMap['units'];
type ProgramRow = ReferenceRowMap['programs'];
type DirectoryRow = ReferenceRowMap['departments'];
type SdgRow = ReferenceRowMap['sdgs'];
type TermRow = ReferenceRowMap['terms'];
type AttachmentRow = ReferenceRowMap['attachment-requirements'];

/** A create payload is the full row, minus the soft-delete column (spec §8). */
type StripDeleted<T> = T extends unknown ? Omit<T, 'deletedAt'> : never;
export type ReferenceInsertValues = StripDeleted<ReferenceRow>;

type DistributivePartial<T> = T extends unknown ? Partial<T> : never;
export type ReferenceUpdateValues = DistributivePartial<ReferenceInsertValues>;

export interface ReferenceRepository {
  list(entity: ReferenceEntityKey): Promise<ReferenceEntry[]>;
  findById(entity: ReferenceEntityKey, id: string): Promise<ReferenceEntry | null>;
  create(entity: ReferenceEntityKey, values: ReferenceInsertValues): Promise<ReferenceEntry>;
  update(
    entity: ReferenceEntityKey,
    id: string,
    values: ReferenceUpdateValues,
  ): Promise<ReferenceEntry | null>;
  setActive(
    entity: ReferenceEntityKey,
    id: string,
    isActive: boolean,
    updatedAt: string,
  ): Promise<ReferenceEntry | null>;
  seed(): Promise<void>;
}

function countUnitsByCampus(units: UnitRow[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const unit of units) counts.set(unit.campusId, (counts.get(unit.campusId) ?? 0) + 1);
  return counts;
}

export function createReferenceRepository(db: Database): ReferenceRepository {
  const queries = createReferenceQueries(db);

  async function toEntries(entity: ReferenceEntityKey, rows: ReferenceRow[]): Promise<ReferenceEntry[]> {
    switch (entity) {
      case 'campuses': {
        const counts = countUnitsByCampus(await queries.list('units'));
        return (rows as CampusRow[]).map((row) => toCampusEntry(row, counts.get(row.id) ?? 0));
      }
      case 'units': {
        const names = new Map((await queries.list('campuses')).map((row) => [row.id, row.name]));
        return (rows as UnitRow[]).map((row) => toUnitEntry(row, names.get(row.campusId) ?? ''));
      }
      case 'programs': {
        const names = new Map((await queries.list('units')).map((row) => [row.id, row.name]));
        return (rows as ProgramRow[]).map((row) => toProgramEntry(row, names.get(row.unitId) ?? ''));
      }
      case 'departments':
      case 'offices':
        return (rows as DirectoryRow[]).map(toDirectoryEntry);
      case 'sdgs':
        return (rows as SdgRow[]).map(toSdgEntry);
      case 'terms':
        return (rows as TermRow[]).map(toTermEntry);
      case 'attachment-requirements':
        return (rows as AttachmentRow[]).map(toAttachmentRequirementEntry);
    }
  }

  async function mapOne(entity: ReferenceEntityKey, row: ReferenceRow): Promise<ReferenceEntry> {
    const [entry] = await toEntries(entity, [row]);
    if (!entry) throw new Error('Reference row could not be mapped');
    return entry;
  }

  return {
    list(entity) {
      return queries.list(entity).then((rows) => toEntries(entity, rows));
    },

    findById(entity, id) {
      return queries.findById(entity, id).then((row) => (row ? mapOne(entity, row) : null));
    },

    async create(entity, values) {
      const row = await queries.create(entity, values as never);
      return mapOne(entity, row);
    },

    async update(entity, id, values) {
      const row = await queries.update(entity, id, values as never);
      return row ? mapOne(entity, row) : null;
    },

    async setActive(entity, id, isActive, updatedAt) {
      const row = await queries.setActive(entity, id, isActive, updatedAt);
      return row ? mapOne(entity, row) : null;
    },

    async seed() {
      await seedReferenceData(db);
    },
  };
}
