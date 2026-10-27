import { describe, expect, it } from 'vitest';

import {
  SEED_CAMPUSES,
  SEED_DEPARTMENTS,
  SEED_OFFICES,
  SEED_PROGRAMS,
  SEED_SDGS,
  SEED_UNITS,
} from './reference-data';

const CODE_PATTERN = /^[A-Z0-9][A-Z0-9-]*$/;

function unitsOf(kind: string): typeof SEED_UNITS {
  return SEED_UNITS.filter((unit) => unit.kind === kind);
}

describe('seed reference data', () => {
  it('has the two campuses', () => {
    expect(SEED_CAMPUSES).toHaveLength(2);
  });

  it('partitions units by kind', () => {
    expect(unitsOf('COLLEGE')).toHaveLength(8);
    expect(unitsOf('GRADUATE_SCHOOL_GROUP')).toHaveLength(2);
    expect(unitsOf('SATELLITE_CAMPUS')).toHaveLength(15);
    expect(unitsOf('OTHER_UNIT')).toHaveLength(3);
  });

  it('resolves every unit campusCode to a campus', () => {
    const campusCodes = new Set(SEED_CAMPUSES.map((campus) => campus.code));
    for (const unit of SEED_UNITS) {
      expect(campusCodes.has(unit.campusCode)).toBe(true);
    }
  });

  it('derives ten academic departments from the units', () => {
    expect(SEED_DEPARTMENTS).toHaveLength(10);

    const academic = SEED_UNITS.filter(
      (unit) => unit.kind === 'COLLEGE' || unit.kind === 'GRADUATE_SCHOOL_GROUP',
    ).map((unit) => unit.name);
    expect(SEED_DEPARTMENTS.map((entry) => entry.name)).toEqual(academic);
    expect(SEED_DEPARTMENTS.map((entry) => entry.sortOrder)).toEqual(
      Array.from({ length: 10 }, (_, index) => index + 1),
    );
  });

  it('derives eighteen support offices from the units', () => {
    expect(SEED_OFFICES).toHaveLength(18);

    const support = SEED_UNITS.filter(
      (unit) => unit.kind === 'SATELLITE_CAMPUS' || unit.kind === 'OTHER_UNIT',
    ).map((unit) => unit.name);
    expect(SEED_OFFICES.map((entry) => entry.name)).toEqual(support);
    expect(SEED_OFFICES.map((entry) => entry.sortOrder)).toEqual(
      Array.from({ length: 18 }, (_, index) => index + 1),
    );
  });

  it('has 44 programs and resolves every unitCode to a unit', () => {
    expect(SEED_PROGRAMS).toHaveLength(44);

    const unitCodes = new Set(SEED_UNITS.map((unit) => unit.code));
    for (const program of SEED_PROGRAMS) {
      expect(unitCodes.has(program.unitCode)).toBe(true);
    }
  });

  it('lists the SDG numbers exactly 1..17 in order', () => {
    expect(SEED_SDGS.map((sdg) => sdg.number)).toEqual(
      Array.from({ length: 17 }, (_, index) => index + 1),
    );
  });

  it('normalizes the source inconsistencies', () => {
    const bsbaFm = SEED_PROGRAMS.find((program) => program.code === 'BSBA-FM');
    expect(bsbaFm?.name).toContain('Business Administration');

    const socialScience = SEED_PROGRAMS.find((program) => program.name.includes('Social Science'));
    expect(socialScience?.code).toBe('AB-SOCSCI');
  });

  it('uses well-formed codes and trimmed names', () => {
    const records = [
      ...SEED_CAMPUSES.map(({ code, name }) => ({ code, name })),
      ...SEED_UNITS.map(({ code, name }) => ({ code, name })),
      ...SEED_PROGRAMS.map(({ code, name }) => ({ code, name })),
    ];

    for (const { code, name } of records) {
      expect(code).toMatch(CODE_PATTERN);
      expect(code).toBe(code.trim());
      expect(name).toBe(name.trim());
    }

    for (const sdg of SEED_SDGS) {
      expect(sdg.title).toBe(sdg.title.trim());
    }

    for (const entry of [...SEED_DEPARTMENTS, ...SEED_OFFICES]) {
      expect(entry.name).toBe(entry.name.trim());
      expect(entry.key).toBe(entry.key.toLowerCase());
    }
  });
});
