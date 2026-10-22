import type { Database } from '../client';
import { createReferenceQueries } from '../queries/reference-data';
import {
  SEED_CAMPUSES,
  SEED_DEPARTMENTS,
  SEED_OFFICES,
  SEED_PROGRAMS,
  SEED_SDGS,
  SEED_UNITS,
  type SeedDirectoryEntry,
} from './reference-data';

function requireId(ids: Map<string, string>, key: string): string {
  const id = ids.get(key);
  if (!id) throw new Error(`Seed reference is missing ${key}`);

  return id;
}

/** Directory names are compared trimmed and case-insensitively; no code exists. */
function directoryName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Seeds campuses, units, programs, SDGs, and the department/office lists derived
 * from the academic and support units (spec §8). Idempotent: a row whose natural
 * key already exists is left untouched, so re-running never duplicates and never
 * overwrites an office edit.
 */
export async function seedReferenceData(db: Database): Promise<void> {
  const reference = createReferenceQueries(db);
  const now = new Date().toISOString();

  const campusIdByCode = new Map(
    (await reference.list('campuses')).map((row) => [row.code, row.id]),
  );
  for (const campus of SEED_CAMPUSES) {
    if (campusIdByCode.has(campus.code)) continue;

    const row = await reference.create('campuses', {
      id: crypto.randomUUID(),
      code: campus.code,
      name: campus.name,
      sortOrder: campus.sortOrder,
      isActive: true,
      isSeeded: true,
      createdAt: now,
      updatedAt: now,
    });
    campusIdByCode.set(campus.code, row.id);
  }

  const unitIdByCode = new Map((await reference.list('units')).map((row) => [row.code, row.id]));
  for (const unit of SEED_UNITS) {
    if (unitIdByCode.has(unit.code)) continue;

    const row = await reference.create('units', {
      id: crypto.randomUUID(),
      code: unit.code,
      name: unit.name,
      kind: unit.kind,
      campusId: requireId(campusIdByCode, unit.campusCode),
      sortOrder: unit.sortOrder,
      isActive: true,
      isSeeded: true,
      createdAt: now,
      updatedAt: now,
    });
    unitIdByCode.set(unit.code, row.id);
  }

  const programIdByCode = new Map(
    (await reference.list('programs')).map((row) => [row.code, row.id]),
  );
  for (const program of SEED_PROGRAMS) {
    if (programIdByCode.has(program.code)) continue;

    const row = await reference.create('programs', {
      id: crypto.randomUUID(),
      code: program.code,
      name: program.name,
      level: program.level,
      unitId: requireId(unitIdByCode, program.unitCode),
      sortOrder: program.sortOrder,
      isActive: true,
      isSeeded: true,
      createdAt: now,
      updatedAt: now,
    });
    programIdByCode.set(program.code, row.id);
  }

  async function seedDirectory(
    entity: 'departments' | 'offices',
    entries: readonly SeedDirectoryEntry[],
  ): Promise<void> {
    const existing = new Set((await reference.list(entity)).map((row) => directoryName(row.name)));

    for (const entry of entries) {
      if (existing.has(directoryName(entry.name))) continue;

      await reference.create(entity, {
        id: crypto.randomUUID(),
        name: entry.name,
        sortOrder: entry.sortOrder,
        isActive: true,
        isSeeded: true,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  await seedDirectory('departments', SEED_DEPARTMENTS);
  await seedDirectory('offices', SEED_OFFICES);

  const sdgNumbers = new Set((await reference.list('sdgs')).map((row) => row.number));
  for (const sdg of SEED_SDGS) {
    if (sdgNumbers.has(sdg.number)) continue;

    await reference.create('sdgs', {
      id: crypto.randomUUID(),
      number: sdg.number,
      title: sdg.title,
      isActive: true,
      isSeeded: true,
      createdAt: now,
      updatedAt: now,
    });
  }
}
