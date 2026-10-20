import type { ReportDetail } from '@par/shared';
import { describe, expect, it } from 'vitest';

import { attachmentGroups, facsimileSections, referenceCounts } from './facsimile-document';
import { estimatePageCount, generatedStamp, printFooter } from './facsimile-print';
const detail = (overrides: Partial<ReportDetail> = {}): ReportDetail => ({
  id: 'r1',
  ownerUserId: 'u1',
  trackingNumber: 'OFF-2026-0014',
  status: 'SUBMITTED',
  version: 3,
  updatedAt: '2026-03-14T01:12:00.000Z',
  submittedAt: '2026-03-14T01:12:00.000Z',
  form: {
    type: 'OFF_CAMPUS',
    classification: 'CURRICULAR',
    campusId: 'c1',
    unitId: 'un1',
    level: 'UNDERGRADUATE',
    title: 'Coastal cleanup',
    activityStartDate: '2026-03-12',
    activityEndDate: '2026-03-12',
    location: 'Brgy. Poblacion',
    totalStudents: 42,
    totalPic: 3,
    pics: [
      { name: 'M. Santos', email: 'msantos@example.edu', phone: '0917 000 0000' },
      { name: 'J. Cruz' },
    ],
    sdgIds: ['s14'],
    narrative: 'The activity gathered volunteers.\n\nShoreline debris was recorded.',
  },
  attachments: [
    {
      id: 'a1',
      reportId: 'r1',
      label: 'Attendance sheet',
      originalName: 'Attendance sheet.pdf',
      size: 1.2 * 1024 * 1024,
      mimeType: 'application/pdf',
      status: 'CONFIRMED',
    },
    {
      id: 'a2',
      reportId: 'r1',
      label: 'Photos',
      originalName: 'Photos.zip',
      size: 8.4 * 1024 * 1024,
      mimeType: 'application/zip',
      status: 'CONFIRMED',
    },
    {
      id: 'a3',
      reportId: 'r1',
      label: 'Removed',
      originalName: 'Removed.pdf',
      size: 10,
      mimeType: 'application/pdf',
      status: 'DELETED',
    },
  ],
  people: {
    submitter: { fullName: 'J. Dela Cruz', role: 'SUBMITTER' },
    reviewer: { fullName: 'M. Santos', role: 'REVIEWER' },
  },
  ...overrides,
});

const references = {
  campuses: [{ id: 'c1', name: 'Main' } as never],
  units: [{ id: 'un1', name: 'Arts and Sciences' } as never],
  sdgs: [{ id: 's14', number: 14, title: 'Life below water' } as never],
};

describe('facsimileSections', () => {
  it('renders the three official sections in order with resolved values', () => {
    const sections = facsimileSections(detail(), references);

    expect(sections.map((section) => `${section.numeral}. ${section.title}`)).toEqual([
      'I. Activity classification',
      'II. Activity',
      'III. Participants',
    ]);

    const values = Object.fromEntries(
      sections.flatMap((section) => section.rows.map((row) => [row.label, row.value])),
    );

    expect(values).toMatchObject({
      'Activity type': 'Off-campus',
      Classification: 'Curricular',
      Campus: 'Main',
      'College or unit': 'Arts and Sciences',
      Department: '—',
      Office: '—',
      Level: 'Undergraduate',
      'Title of the activity': 'Coastal cleanup',
      'Date(s) of activity': '12 Mar 2026',
      Location: 'Brgy. Poblacion',
      'SDG(s)': '14 Life below water',
      'Total number of students': '42',
      'Total number of PIC': '3',
    });
  });

  it('keeps PIC names and contacts on their own lines and uses an em dash when empty', () => {
    const rows = facsimileSections(detail(), references)[2].rows;

    expect(rows.find((row) => row.label === 'Name(s) of personnel in-charge')).toEqual({
      label: 'Name(s) of personnel in-charge',
      value: 'M. Santos\nJ. Cruz',
      multiline: true,
    });
    expect(rows.find((row) => row.label === 'PIC email/contact')?.value).toBe(
      'msantos@example.edu · 0917 000 0000',
    );

    const empty = facsimileSections(
      detail({ form: { ...detail().form, pics: [{ name: 'J. Cruz' }] } }),
      references,
    )[2].rows;
    expect(empty.find((row) => row.label === 'PIC email/contact')?.value).toBe('—');
  });
});

describe('attachmentGroups', () => {
  it('groups live attachments by their label and drops deleted ones', () => {
    expect(attachmentGroups(detail().attachments)).toEqual([
      { label: 'Attendance sheet', files: ['Attendance sheet.pdf'] },
      { label: 'Photos', files: ['Photos.zip'] },
    ]);
  });

  it('keeps unlabelled files visible', () => {
    expect(attachmentGroups([{ ...detail().attachments[0], id: 'a9', label: '  ' }])).toEqual([
      { label: 'Unlabelled', files: ['Attendance sheet.pdf'] },
    ]);
  });
});

describe('referenceCounts', () => {
  it('counts the report fields that carry a value', () => {
    expect(referenceCounts(detail())).toBe(14);
  });
});
describe('print helpers', () => {
  it('builds the footer from the generation time, tracking number, and page count', () => {
    const footer = printFooter({
      now: new Date('2026-10-17T06:02:00.000Z'),
      trackingNumber: 'OFF-2026-0014',
      pageCount: 2,
    });

    expect(footer).toBe('Generated 17 Oct 2026 14:02 · OFF-2026-0014 · Page 1 of 2');
  });

  it('measures pages from the sheet height and never reports zero', () => {
    expect(estimatePageCount(0)).toBe(1);
    expect(estimatePageCount(1122)).toBe(1);
    expect(estimatePageCount(1123)).toBe(2);
  });

  it('formats the generation stamp in Asia/Manila', () => {
    expect(generatedStamp(new Date('2026-10-17T06:02:00.000Z'))).toBe('17 Oct 2026 14:02');
  });
});
