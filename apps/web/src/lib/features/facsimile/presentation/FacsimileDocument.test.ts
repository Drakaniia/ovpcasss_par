import type { ReportDetail } from '@par/shared';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import { commentRounds } from '../application/facsimile-history';
import { signatureBlock } from '../application/facsimile-people';
import FacsimileDocument from './FacsimileDocument.svelte';

const detail = (overrides: Partial<ReportDetail> = {}): ReportDetail => ({
  id: 'r1',
  ownerUserId: 'u1',
  trackingNumber: 'OFF-2026-0014',
  status: 'RETURNED_BY_REVIEWER',
  version: 3,
  updatedAt: '2026-03-16T01:12:00.000Z',
  submittedAt: '2026-03-14T01:12:00.000Z',
  returnedAt: '2026-03-15T02:40:00.000Z',
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
    pics: [{ name: 'M. Santos', email: 'msantos@example.edu' }],
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
  ],
  returnEvent: {
    round: 1,
    comments: 'Please attach the attendance sheet.',
    authorName: 'M. Santos',
    authorRole: 'REVIEWER',
    createdAt: '2026-03-15T02:40:00.000Z',
  },
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

function renderDocument(overrides: Partial<ReportDetail> = {}, print = false) {
  const report = detail(overrides);

  return render(FacsimileDocument, {
    props: {
      detail: report,
      references,
      rounds: commentRounds(report),
      block: signatureBlock(report),
      print,
    },
  }).body;
}

describe('FacsimileDocument', () => {
  it('renders the letterhead, reference block, and sections in official order', () => {
    const html = renderDocument();

    expect(html).toContain('OVPCASSS');
    expect(html).toContain('POST-ACTIVITY REPORT');
    expect(html).toContain('Reference No.');
    expect(html).toContain('OFF-2026-0014');
    expect(html).toContain('Date received');
    expect(html).toContain('Date completed');

    const anchors = [
      'id="section-activity-classification"',
      'id="section-activity"',
      'id="section-participants"',
      'id="narrative"',
      'id="attachments"',
      'id="review-history"',
      'id="signatures-heading"',
    ];

    let previous = -1;
    for (const anchor of anchors) {
      const index = html.indexOf(anchor);
      expect(index).toBeGreaterThan(previous);
      previous = index;
    }

    for (const numeral of ['I.', 'II.', 'III.', 'IV.', 'V.', 'VI.']) {
      expect(html).toContain(numeral);
    }
  });

  it('uses the official field labels and resolved reference values', () => {
    const html = renderDocument();

    for (const label of [
      'Activity type',
      'Classification',
      'Campus',
      'College or unit',
      'Department',
      'Office',
      'Level',
      'Title of the activity',
      'Date(s) of activity',
      'Location',
      'SDG(s)',
      'Total number of students',
      'Total number of PIC',
      'Name(s) of personnel in-charge',
      'PIC email/contact',
    ]) {
      expect(html).toContain(label);
    }

    expect(html).toContain('14 Life below water');
    expect(html).toContain('Arts and Sciences');
  });

  it('preserves narrative paragraphs without rendering user HTML', () => {
    const html = renderDocument({
      form: { ...detail().form, narrative: 'First paragraph.\n\nSecond <b>paragraph</b>.' },
    });

    expect(html).toContain('First paragraph.\n\nSecond &lt;b>paragraph&lt;/b>.');
    expect(html).not.toContain('<b>paragraph</b>');
  });

  it('renders an em dash for every empty optional value', () => {
    const html = renderDocument({
      form: { ...detail().form, department: undefined, office: '', pics: [{ name: 'M. Santos' }] },
      completedAt: undefined,
    });

    expect(html.match(/—/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
  });

  it('keeps the status, review rounds, and history out of the print variant', () => {
    const record = renderDocument();
    const print = renderDocument({}, true);

    expect(record).toContain('Status');
    expect(record).toContain('Round 1 — returned by M. Santos (Reviewer), 15 Mar 2026');
    expect(record).toContain('Please attach the attendance sheet.');

    expect(print).not.toContain('Round 1 — returned by');
    expect(print).not.toContain('id="review-history"');
    expect(print).toContain('POST-ACTIVITY REPORT');
    expect(print).toContain('Signatures');
  });

  it('leaves the approved-by block blank until the report is approved', () => {
    const html = renderDocument();

    expect(html).toContain('Submitted by');
    expect(html).toContain('J. Dela Cruz');
    expect(html).toContain('Approved by');
    expect(html).not.toContain('Signature of');
  });

  it('shows the approver name, date, and signature image once approved', () => {
    const html = renderDocument({
      status: 'APPROVED',
      completedAt: '2026-03-20T01:00:00.000Z',
      approval: {
        signerName: 'A. Reyes',
        signedAt: '2026-03-20T01:00:00.000Z',
        signatureUrl: 'https://signed.example/sig.png',
      },
    });

    expect(html).toContain('A. Reyes');
    expect(html).toContain('20 Mar 2026');
    expect(html).toContain('src="https://signed.example/sig.png"');
    expect(html).toContain('alt="Signature of A. Reyes"');
  });

  it('lists attachment labels with their file names', () => {
    const html = renderDocument();

    expect(html).toContain('Attendance sheet');
    expect(html).toContain('Attendance sheet.pdf');
  });

  it('says No attachments when nothing was uploaded', () => {
    expect(renderDocument({ attachments: [] })).toContain('No attachments.');
  });
});
