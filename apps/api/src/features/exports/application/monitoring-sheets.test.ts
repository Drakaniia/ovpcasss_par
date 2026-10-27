import type { MonitoringReportRecord } from '@par/db';
import { SHEET_GEOMETRY } from '@par/export';
import { describe, expect, it } from 'vitest';

import { buildMonitoringSheet } from './monitoring-sheets';

function record(overrides: Partial<MonitoringReportRecord>): MonitoringReportRecord {
  return {
    id: 'rep_1',
    type: 'OFF_CAMPUS',
    referenceNo: 'AR No. 0042',
    status: 'APPROVED',
    classification: 'CURRICULAR',
    campusName: 'MAIN',
    unitName: 'COLLEGE OF EDUCATION',
    department: 'Elementary Education',
    office: 'OVPCASSS',
    level: 'UNDERGRADUATE',
    title: 'Community Literacy Outreach',
    activityStartDate: '2026-03-12',
    activityEndDate: '2026-03-12',
    location: 'Barangay Poblacion',
    totalStudents: 120,
    totalPic: 4,
    createdAt: '2026-03-10T08:00:00.000Z',
    submittedAt: '2026-03-14T08:00:00.000Z',
    approvedAt: '2026-03-20T08:00:00.000Z',
    completedOn: null,
    narrative: '',
    sdgNumbers: [4, 10],
    pics: [{ name: 'Maria Santos', email: 'maria.santos@example.edu', phone: null }],
    ...overrides,
  };
}

const REQUEST = {
  type: 'OFF_CAMPUS' as const,
  schoolYear: '2025-2026',
  semester: 2 as const,
  includeInProgress: false,
  includeArchived: false,
};

describe('monitoring sheet', () => {
  it('writes the selected sheet in source order', () => {
    const { sheet } = buildMonitoringSheet([record({})], REQUEST);

    expect(sheet.sheetName).toBe('OFF-CAMPUS');
    expect(sheet.columns).toHaveLength(19);
    expect(sheet.title).toBe('LOCAL OFF-CAMPUS  ACTIVITIES MONITORING\n2nd SEMESTER, SY 2025-2026');
  });

  it('hands the preview the workbook geometry the file is written with', () => {
    const { sheet } = buildMonitoringSheet([record({})], REQUEST);

    expect(sheet.layout).toEqual(SHEET_GEOMETRY.OFF_CAMPUS);
    expect(sheet.layout.columnWidths).toHaveLength(19);
    expect(sheet.layout.reservedRows).toBe(20);
  });

  it('ignores reports for the other sheets', () => {
    const { sheet, rows } = buildMonitoringSheet(
      [record({}), record({ id: 'rep_2', type: 'IN_CAMPUS', referenceNo: 'AR No. 0001' })],
      { ...REQUEST, includeInProgress: true },
    );

    expect(rows).toHaveLength(1);
    expect(sheet.total).toBe(1);
  });

  it('maps a report onto the 19 monitoring values', () => {
    const { sheet, rows } = buildMonitoringSheet([record({})], REQUEST);
    const row = sheet.rows[0]!;

    expect(row).toMatchObject({
      index: 1,
      dateReceived: '2026-03-14',
      referenceNo: 'AR No. 0042',
      classification: 'Curricular',
      campus: 'MAIN',
      college: 'COLLEGE OF EDUCATION',
      level: 'Undergraduate',
      sdg: '4, 10',
      activityDate: '2026-03-12',
      picName: 'Maria Santos',
      picContact: 'maria.santos@example.edu',
      dateCompleted: '2026-03-20',
      dateRequested: '2026-03-10',
    });
    expect(rows[0]).toEqual(row);
  });

  it('renders dates as Manila calendar dates, not the previous UTC day', () => {
    const { sheet } = buildMonitoringSheet(
      [
        record({
          createdAt: '2026-10-21T23:30:00.000Z',
          submittedAt: '2026-10-21T23:30:00.000Z',
          approvedAt: '2026-10-21T23:30:00.000Z',
        }),
      ],
      REQUEST,
    );

    expect(sheet.rows[0]).toMatchObject({
      dateRequested: '2026-10-22',
      dateReceived: '2026-10-22',
      dateCompleted: '2026-10-22',
    });
  });

  it("prints the office's Date Completed, falling back to the approval day", () => {
    const { sheet } = buildMonitoringSheet(
      [
        record({ completedOn: '2026-03-18' }),
        record({
          id: 'rep_2',
          referenceNo: 'AR No. 0043',
          completedOn: null,
          approvedAt: '2026-03-22T23:30:00.000Z',
        }),
      ],
      REQUEST,
    );

    expect(sheet.rows.map((row) => row.dateCompleted)).toEqual(['2026-03-18', '2026-03-23']);
  });

  it('counts approved and in-progress rows', () => {
    const { sheet } = buildMonitoringSheet(
      [
        record({}),
        record({
          id: 'rep_2',
          referenceNo: 'AR No. 0043',
          status: 'SUBMITTED',
          approvedAt: null,
        }),
      ],
      { ...REQUEST, includeInProgress: true },
    );

    expect(sheet).toMatchObject({ approvedCount: 1, inProgressCount: 1, total: 2 });
  });

  it('names fields that will export blank without blocking the sheet', () => {
    const { sheet } = buildMonitoringSheet(
      [record({ office: null, pics: [], sdgNumbers: [] })],
      REQUEST,
    );

    expect(sheet.warnings).toContain('AR No. 0042 has no Office — it will export blank.');
    expect(sheet.warnings).toContain(
      'AR No. 0042 has no Name of Personnel In-charge — it will export blank.',
    );
    expect(sheet.missingCount).toBe(1);
    expect(sheet.total).toBe(1);
  });
});
