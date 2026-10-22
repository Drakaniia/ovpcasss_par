import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import {
  SEED_CAMPUSES,
  SEED_DEPARTMENTS,
  SEED_OFFICES,
  SEED_PROGRAMS,
  SEED_SDGS,
  SEED_UNITS,
} from '../src/seed/reference-data.ts';

/**
 * Emits the reference-data seed as idempotent SQL for `wrangler d1 execute`
 * (cloud-seed-role-rebrand spec §3). Ids are deterministic so a rerun cannot
 * create a second copy through a fresh random id, and every insert is guarded by
 * `WHERE NOT EXISTS` on the natural key so office edits are never overwritten.
 *
 * Node 24 strips the types, so this runs without a build step:
 *   node packages/db/scripts/seed-sql.ts --out .turbo/seed.sql
 *   node packages/db/scripts/seed-sql.ts --stdout
 */

const NOW = "strftime('%Y-%m-%dT%H:%M:%fZ','now')";

function quote(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function lowerName(name: string): string {
  return quote(name.trim().toLowerCase());
}

/** One row: `INSERT … SELECT … WHERE NOT EXISTS (… natural key …)`. */
function insert(
  table: string,
  columns: readonly string[],
  values: readonly string[],
  naturalKey: string,
): string {
  return [
    `INSERT INTO ${table} (${columns.join(', ')})`,
    `SELECT ${values.join(', ')}`,
    `WHERE NOT EXISTS (SELECT 1 FROM ${table} WHERE ${naturalKey});`,
  ].join('\n');
}

const BOOKKEEPING = ['is_active', 'is_seeded', 'deleted_at', 'created_at', 'updated_at'];

function bookkeeping(): string[] {
  return ['1', '1', 'NULL', NOW, NOW];
}

function seedStatement(): string {
  const statements: string[] = [];

  for (const campus of SEED_CAMPUSES) {
    statements.push(
      insert(
        'ref_campuses',
        ['id', 'code', 'name', 'sort_order', ...BOOKKEEPING],
        [
          quote(`seed-campus-${campus.code.toLowerCase()}`),
          quote(campus.code),
          quote(campus.name),
          String(campus.sortOrder),
          ...bookkeeping(),
        ],
        `code = ${quote(campus.code)}`,
      ),
    );
  }

  for (const unit of SEED_UNITS) {
    statements.push(
      insert(
        'ref_units',
        ['id', 'code', 'name', 'kind', 'campus_id', 'sort_order', ...BOOKKEEPING],
        [
          quote(`seed-unit-${unit.code.toLowerCase()}`),
          quote(unit.code),
          quote(unit.name),
          quote(unit.kind),
          quote(`seed-campus-${unit.campusCode.toLowerCase()}`),
          String(unit.sortOrder),
          ...bookkeeping(),
        ],
        `code = ${quote(unit.code)}`,
      ),
    );
  }

  for (const program of SEED_PROGRAMS) {
    statements.push(
      insert(
        'ref_programs',
        ['id', 'code', 'name', 'level', 'unit_id', 'sort_order', ...BOOKKEEPING],
        [
          quote(`seed-program-${program.code.toLowerCase()}`),
          quote(program.code),
          quote(program.name),
          quote(program.level),
          quote(`seed-unit-${program.unitCode.toLowerCase()}`),
          String(program.sortOrder),
          ...bookkeeping(),
        ],
        `code = ${quote(program.code)}`,
      ),
    );
  }

  for (const sdg of SEED_SDGS) {
    statements.push(
      insert(
        'ref_sdgs',
        ['id', 'number', 'title', ...BOOKKEEPING],
        [
          quote(`seed-sdg-${sdg.number}`),
          String(sdg.number),
          quote(sdg.title),
          ...bookkeeping(),
        ],
        `number = ${sdg.number}`,
      ),
    );
  }

  for (const department of SEED_DEPARTMENTS) {
    statements.push(
      insert(
        'ref_departments',
        ['id', 'name', 'sort_order', ...BOOKKEEPING],
        [
          quote(`seed-department-${department.key}`),
          quote(department.name),
          String(department.sortOrder),
          ...bookkeeping(),
        ],
        `lower(trim(name)) = ${lowerName(department.name)}`,
      ),
    );
  }

  for (const office of SEED_OFFICES) {
    statements.push(
      insert(
        'ref_offices',
        ['id', 'name', 'sort_order', ...BOOKKEEPING],
        [
          quote(`seed-office-${office.key}`),
          quote(office.name),
          String(office.sortOrder),
          ...bookkeeping(),
        ],
        `lower(trim(name)) = ${lowerName(office.name)}`,
      ),
    );
  }

  return `${statements.join('\n\n')}\n`;
}

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

const sql = seedStatement();

if (process.argv.includes('--stdout')) {
  process.stdout.write(sql);
} else {
  const out = resolve(argument('--out') ?? '.turbo/seed.sql');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, sql, 'utf8');
  process.stdout.write(`Wrote ${out}\n`);
}
