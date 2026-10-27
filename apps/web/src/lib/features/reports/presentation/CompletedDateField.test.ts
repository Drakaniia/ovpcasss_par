import type { ReportDetail } from '@par/shared';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import CompletedDateField from './CompletedDateField.svelte';

function detail(patch: Partial<ReportDetail> = {}): ReportDetail {
  return {
    id: 'report-1',
    referenceNo: 'AR No. 0001',
    createdByUserId: 'user-1',
    status: 'APPROVED',
    version: 4,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-24T00:00:00.000Z',
    submittedAt: '2026-10-10T02:00:00.000Z',
    approvedAt: '2026-10-20T02:00:00.000Z',
    completedOn: '2026-10-18',
    form: {
      type: 'OFF_CAMPUS',
      classification: 'CURRICULAR',
      level: 'UNDERGRADUATE',
      title: 'Community literacy outreach',
      activityStartDate: '2026-10-12',
      activityEndDate: '2026-10-12',
      location: 'Malaybalay City',
      activityCount: 1,
      totalStudents: 40,
      totalPic: 1,
      pics: [],
      sdgIds: [],
      narrative: '',
    },
    pics: [],
    attachments: [],
    receipts: [],
    canSetCompletedDate: true,
    ...patch,
  } as ReportDetail;
}

describe('CompletedDateField', () => {
  it("shows the office's saved date and what the sheet prints", () => {
    const { body } = render(CompletedDateField, {
      props: { detail: detail(), onchanged: () => undefined },
    });

    expect(body).toContain('Date completed');
    expect(body).toContain('value="18 Oct 2026"');
    expect(body).toContain('The monitoring sheet prints 18 October 2026.');
  });

  it('names the approval date a blank field falls back to', () => {
    const { body } = render(CompletedDateField, {
      props: { detail: detail({ completedOn: undefined }), onchanged: () => undefined },
    });

    expect(body).toContain('value=""');
    expect(body).toContain('Blank prints the approval date, 20 October 2026.');
  });

  it('holds the save until the date actually changes', () => {
    const { body } = render(CompletedDateField, {
      props: { detail: detail(), onchanged: () => undefined },
    });

    expect(body).toMatch(/<button[^>]*disabled[^>]*>Save<\/button>/);
  });
});
