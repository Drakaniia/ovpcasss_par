import type { ImportedMonitoringRow } from '@par/export';
import { describe, expect, it } from 'vitest';

import { parseSdgNumbers, planImportRow, type ImportReferences } from './import-plan';

const REFERENCES: ImportReferences = {
  campuses: [
    { id: 'campus_main', name: 'MAIN', code: 'MAIN' },
    { id: 'campus_sat', name: 'SATELLITE', code: 'SATELLITE' },
  ],
  units: [
    { id: 'unit_ced', name: 'COLLEGE OF EDUCATION', code: 'CED' },
    { id: 'unit_sf', name: 'SAN-FERNANDO SATELLITE CAMPUS', code: 'SAN-FERNANDO' },
  ],
  sdgs: [
    { id: 'sdg_4', number: 4 },
    { id: 'sdg_10', number: 10 },
    { id: 'sdg_17', number: 17 },
  ],
};

function row(overrides: Partial<ImportedMonitoringRow> = {}): ImportedMonitoringRow {
  return {
    type: 'OFF_CAMPUS',
    sheetName: 'OFF-CAMPUS',
    rowNumber: 3,
    dateReceived: '2026-03-14',
    trackingNumber: 'OFF-2026-0042',
    classification: 'Curricular',
    campus: 'MAIN',
    college: 'COLLEGE OF EDUCATION',
    department: 'Elementary Education',
    office: 'OVPCASSS',
    level: 'Undergraduate',
    title: 'Community Literacy Outreach',
    sdg: 'SDG 4, SDG 10',
    activityDate: '2026-03-12',
    location: 'Barangay Poblacion',
    totalStudents: 120,
    totalPic: 4,
    picName: 'Maria Santos',
    picContact: 'maria.santos@example.edu',
    dateCompleted: '2026-03-20',
    ...overrides,
  };
}

describe('import plan', () => {
  it('resolves names case- and hyphen-insensitively', () => {
    const result = planImportRow(row({ campus: 'satellite', college: 'San Fernando Satellite Campus' }), REFERENCES);

    expect(result.issues).toEqual([]);
    expect(result.values).toMatchObject({
      campusId: 'campus_sat',
      unitId: 'unit_sf',
      status: 'APPROVED',
      submittedAt: '2026-03-14T00:00:00.000Z',
      approvedAt: '2026-03-20T00:00:00.000Z',
    });
  });

  it('keeps a report in progress when Date Completed is blank', () => {
    const result = planImportRow(row({ dateCompleted: '' }), REFERENCES);

    expect(result.values).toMatchObject({ status: 'SUBMITTED', approvedAt: null });
  });

  it('maps SDG numbers and ignores a year in the same cell', () => {
    expect(parseSdgNumbers('SDG 4, SDG 10 (2026)')).toEqual([4, 10]);
    expect(planImportRow(row({ sdg: '4, 10' }), REFERENCES).values?.sdgIds).toEqual([
      'sdg_4',
      'sdg_10',
    ]);
  });

  it('rejects a tracking number from another sheet', () => {
    const result = planImportRow(row({ trackingNumber: 'INC-2026-0001' }), REFERENCES);

    expect(result.values).toBeNull();
    expect(result.issues.join(' ')).toContain('does not belong on the OFF-CAMPUS sheet');
  });

  it('rejects an unknown college instead of inventing reference data', () => {
    const result = planImportRow(row({ college: 'COLLEGE OF WIZARDRY' }), REFERENCES);

    expect(result.values).toBeNull();
    expect(result.issues.join(' ')).toContain('is not in reference data');
  });

  it('rejects a row without a date of activity', () => {
    const result = planImportRow(row({ activityDate: '' }), REFERENCES);

    expect(result.values).toBeNull();
    expect(result.issues.join(' ')).toContain('Date of the Activity');
  });
});
