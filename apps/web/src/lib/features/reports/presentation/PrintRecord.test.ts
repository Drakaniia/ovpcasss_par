import type { ReportDetail } from '@par/shared';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import PrintRecord from './PrintRecord.svelte';

function detail(patch: Partial<ReportDetail> = {}): ReportDetail {
  return {
    id: 'report-1',
    referenceNo: 'AR No. 0001',
    createdByUserId: 'user-1',
    status: 'PENDING',
    version: 1,
    createdAt: '2026-10-24T00:00:00.000Z',
    updatedAt: '2026-10-24T00:00:00.000Z',
    form: {
      type: 'OFF_CAMPUS',
      classification: 'CURRICULAR',
      campusId: 'campus-1',
      unitId: 'unit-1',
      department: 'College of Public Administration and Governance',
      office: '',
      level: 'UNDERGRADUATE',
      title: 'sample',
      activityStartDate: '2026-10-13',
      activityEndDate: '2026-10-13',
      location: 'Malaybalay City',
      activityCount: 1,
      totalStudents: 2,
      totalPic: 1,
      pics: [],
      sdgIds: [],
      narrative: '',
    },
    pics: [],
    attachments: [],
    receipts: [],
    canWriteNarrative: true,
    ...patch,
  } as ReportDetail;
}

describe('PrintRecord', () => {
  it('prints the university letterhead, as the acknowledgment receipt does', () => {
    const { body } = render(PrintRecord, {
      props: { detail: detail(), campusName: 'Aglayan Campus', unitName: 'CAS' },
    });

    expect(body).toContain('>Bukidnon State University</p>');
    expect(body).toContain('Malaybalay City, Bukidnon, 8700');
    expect(body).toContain('www.buksu.edu.ph');
    expect(body).toContain(
      'Office of the Vice President for Culture, Arts, Sports and Student Services',
    );
    expect(body).toContain('AR No. 0001');
    expect(body).toContain('POST-ACTIVITY REPORT');
  });

  it('keeps the four numbered sections and both signature lines', () => {
    const { body } = render(PrintRecord, { props: { detail: detail() } });

    for (const heading of ['I. Activity', 'II. Participants', 'III. Narrative', 'IV. Signatures']) {
      expect(body).toContain(`>${heading}</h2>`);
    }

    expect(body).toContain('Submitted by');
    expect(body).toContain('Approved by');
  });
});
