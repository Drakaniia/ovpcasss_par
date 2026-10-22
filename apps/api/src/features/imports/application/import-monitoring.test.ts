import type { MonitoringQueries, ReportRow } from '@par/db';
import type { ImportedMonitoringRow, ParsedMonitoringSheet } from '@par/export';
import { describe, expect, it } from 'vitest';

import { importMonitoring } from './import-monitoring';
import type { ImportReferences } from '../domain/import-plan';

const REFERENCES: ImportReferences = {
  campuses: [{ id: 'campus_main', name: 'MAIN' }],
  units: [{ id: 'unit_ced', name: 'COLLEGE OF EDUCATION' }],
  sdgs: [{ id: 'sdg_4', number: 4 }],
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
    sdg: '4',
    activityDate: '2026-03-12',
    location: 'Barangay Poblacion',
    totalStudents: 120,
    totalPic: 4,
    picName: 'Maria Santos',
    picContact: '0917 000 0000',
    dateCompleted: '2026-03-20',
    ...overrides,
  };
}

function sheet(rows: ImportedMonitoringRow[], blankRows = 2): ParsedMonitoringSheet {
  return { type: 'OFF_CAMPUS', sheetName: 'OFF-CAMPUS', rows, blankRows };
}

function existing(overrides: Partial<ReportRow> = {}): ReportRow {
  return {
    id: 'rep_existing',
    type: 'OFF_CAMPUS',
    trackingNumber: 'OFF-2026-0042',
    status: 'APPROVED',
    version: 3,
    ownerUserId: 'usr_owner',
    classification: 'CURRICULAR',
    campusId: 'campus_main',
    unitId: 'unit_ced',
    department: 'Elementary Education',
    office: 'OVPCASSS',
    level: 'UNDERGRADUATE',
    title: 'Old title',
    activityStartDate: '2026-03-12',
    activityEndDate: '2026-03-12',
    location: 'Barangay Poblacion',
    totalStudents: 100,
    totalPic: 3,
    narrative: 'Long narrative',
    draftForm: null,
    submittedAt: '2026-03-14T00:00:00.000Z',
    submitterSignatureKey: null,
    submitterSignedAt: null,
    endorsedAt: null,
    approvedAt: '2026-03-20T00:00:00.000Z',
    approvedByUserId: 'usr_approver',
    createdAt: '2026-03-14T00:00:00.000Z',
    updatedAt: '2026-03-20T00:00:00.000Z',
    ...overrides,
  };
}

function fakeQueries(current: ReportRow[] = []) {
  const inserted: unknown[] = [];
  const updated: { id: string; values: Record<string, unknown> }[] = [];
  const counters: { prefix: string; year: number; seq: number }[] = [];

  const queries = {
    findByTrackingNumbers: async (numbers: readonly string[]) => {
      const map = new Map<string, ReportRow>();
      for (const report of current) {
        if (report.trackingNumber && numbers.includes(report.trackingNumber)) {
          map.set(report.trackingNumber, report);
        }
      }
      return map;
    },
    insertImportedReport: async (values: unknown) => {
      inserted.push(values);
    },
    updateImportedReport: async (id: string, values: Record<string, unknown>) => {
      updated.push({ id, values });
    },
    raiseTrackingCounter: async (prefix: string, year: number, seq: number) => {
      counters.push({ prefix, year, seq });
    },
  } as unknown as MonitoringQueries;

  return { queries, inserted, updated, counters };
}

const AT = '2026-10-19T12:00:00.000Z';

describe('import monitoring workbook', () => {
  it('creates a report from a valid row and advances the tracking counter', async () => {
    const { queries, inserted, counters } = fakeQueries();

    const result = await importMonitoring(queries, {
      sheets: [sheet([row()])],
      references: REFERENCES,
      actorUserId: 'usr_admin',
      now: AT,
    });

    expect(result).toMatchObject({ created: 1, updated: 0, failed: 0, skipped: 2 });
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({
      trackingNumber: 'OFF-2026-0042',
      ownerUserId: 'usr_admin',
      narrative: '',
      status: 'APPROVED',
    });
    expect(counters).toEqual([{ prefix: 'OFF', year: 2026, seq: 42 }]);
  });

  it('updates an existing report without downgrading an approval', async () => {
    const { queries, inserted, updated } = fakeQueries([existing()]);

    const result = await importMonitoring(queries, {
      sheets: [sheet([row({ title: 'New title', dateCompleted: '' })])],
      references: REFERENCES,
      actorUserId: 'usr_admin',
      now: AT,
    });

    expect(result).toMatchObject({ created: 0, updated: 1, failed: 0 });
    expect(inserted).toHaveLength(0);
    expect(updated[0]!.id).toBe('rep_existing');
    expect(updated[0]!.values).toMatchObject({
      title: 'New title',
      status: 'APPROVED',
      approvedAt: '2026-03-20T00:00:00.000Z',
      version: 4,
    });
  });

  it('reports invalid rows and writes none of them', async () => {
    const { queries, inserted } = fakeQueries();

    const result = await importMonitoring(queries, {
      sheets: [sheet([row({ college: 'COLLEGE OF WIZARDRY' })])],
      references: REFERENCES,
      actorUserId: 'usr_admin',
      now: AT,
    });

    expect(result).toMatchObject({ created: 0, updated: 0, failed: 1 });
    expect(result.rows[0]!.action).toBe('failed');
    expect(result.rows[0]!.issues.join(' ')).toContain('COLLEGE OF WIZARDRY');
    expect(inserted).toHaveLength(0);
  });
});
