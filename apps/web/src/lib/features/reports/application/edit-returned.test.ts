import type { ReportDetail, ReportReturnEvent } from '@par/shared';
import { describe, expect, it } from 'vitest';

import {
  editAccessFor,
  formatReturnedDate,
  issueSummary,
  returnCallout,
  returnHeader,
  visibleFlags,
  wasReturned,
} from './edit-returned';
import {
  attachmentBlockReason,
  completenessItems,
  type AttachmentUiStatus,
} from './wizard-completeness';
import { emptyWizardForm, formFromDraft } from './wizard-form';

const returnEvent = (overrides: Partial<ReportReturnEvent> = {}): ReportReturnEvent => ({
  comments: 'Please attach the attendance sheet and correct the participant count (42 vs 40).',
  authorName: 'M. Santos',
  authorRole: 'REVIEWER',
  createdAt: '2026-03-15T02:40:00.000Z',
  ...overrides,
});

const detail = (overrides: Partial<ReportDetail> = {}): ReportDetail => ({
  id: 'r1',
  ownerUserId: 'u1',
  trackingNumber: 'OFF-2026-0014',
  status: 'RETURNED_BY_REVIEWER',
  version: 3,
  updatedAt: '2026-03-15T02:40:00.000Z',
  form: {
    type: 'OFF_CAMPUS',
    classification: 'CURRICULAR',
    campusId: 'c1',
    unitId: 'un1',
    department: 'Registrar',
    office: 'OVPCASSS',
    level: 'UNDERGRADUATE',
    title: 'Coastal cleanup',
    activityStartDate: '2026-03-12',
    activityEndDate: '2026-03-13',
    location: 'Brgy. Poblacion',
    totalStudents: 42,
    totalPic: 1,
    pics: [{ name: 'J. Dela Cruz' }],
    sdgIds: ['s1'],
    narrative: 'The activity gathered volunteers.',
  },
  attachments: [],
  returnEvent: returnEvent(),
  returnedAt: '2026-03-15T02:40:00.000Z',
  ...overrides,
});

const owner = { role: 'SUBMITTER' as const, userId: 'u1', ownerUserId: 'u1' };

describe('edit access', () => {
  it('lets only the owning submitter edit a returned report', () => {
    expect(editAccessFor({ ...owner, status: 'RETURNED_BY_REVIEWER' })).toBe('editable');
    expect(editAccessFor({ ...owner, status: 'RETURNED_BY_APPROVER' })).toBe('editable');
    expect(editAccessFor({ ...owner, userId: 'u2', status: 'RETURNED_BY_REVIEWER' })).toBe(
      'denied',
    );
    expect(
      editAccessFor({ ...owner, role: 'ADMIN', status: 'RETURNED_BY_REVIEWER' }),
    ).toBe('denied');
    expect(
      editAccessFor({ ...owner, role: 'REVIEWER', status: 'RETURNED_BY_REVIEWER' }),
    ).toBe('denied');
    expect(editAccessFor({ ...owner, userId: null, status: 'RETURNED_BY_REVIEWER' })).toBe(
      'denied',
    );
  });

  it('redirects a report that was never returned', () => {
    expect(editAccessFor({ ...owner, status: 'SUBMITTED' })).toBe('redirect');
    expect(editAccessFor({ ...owner, status: 'APPROVED' })).toBe('redirect');
  });

  it('serves a draft to the wizard at the same route (spec §7.4)', () => {
    expect(editAccessFor({ ...owner, status: 'DRAFT' })).toBe('draft');
    expect(editAccessFor({ ...owner, userId: 'u2', status: 'DRAFT' })).toBe('denied');
  });

  it('keeps a returned report visible but read-only once it was resubmitted', () => {
    expect(
      editAccessFor({
        ...owner,
        status: 'RESUBMITTED',
        returnEvent: returnEvent(),
      }),
    ).toBe('superseded');
    expect(
      editAccessFor({
        ...owner,
        status: 'SUBMITTED',
        returnedAt: '2026-03-15T02:40:00.000Z',
      }),
    ).toBe('superseded');
  });

  it('knows whether a report came back at least once', () => {
    expect(wasReturned({ returnEvent: returnEvent() })).toBe(true);
    expect(wasReturned({ returnedAt: '2026-03-15T02:40:00.000Z' })).toBe(true);
    expect(wasReturned({})).toBe(false);
  });
});

describe('return copy', () => {
  it('names the role and date in the header', () => {
    const header = returnHeader(detail());
    expect(header).toMatchObject({ roleLabel: 'reviewer', authorName: 'M. Santos' });
    expect(formatReturnedDate(header!.returnedAt)).toBe('15 Mar 2026');
  });

  it('falls back to the status role when the API omits the return event', () => {
    const header = returnHeader(
      detail({ returnEvent: undefined, status: 'RETURNED_BY_APPROVER' }),
    );
    expect(header?.roleLabel).toBe('approver');
  });

  it('renders no return line without a return timestamp', () => {
    expect(returnHeader(detail({ returnEvent: undefined, returnedAt: undefined }))).toBeNull();
  });

  it('puts the latest comment and its flagged fields in the callout', () => {
    const callout = returnCallout(
      detail({
        returnEvent: returnEvent({ fieldIds: ['totalStudents', 'activity_start_date'] }),
      }),
    );

    expect(callout?.authorName).toBe('M. Santos');
    expect(callout?.roleLabel).toBe('reviewer');
    expect(callout?.comments).toContain('attendance sheet');
    expect(callout?.flagged).toEqual(['startDate', 'totalStudents']);
  });

  it('renders no callout when there is no return event', () => {
    expect(returnCallout(detail({ returnEvent: null }))).toBeNull();
  });

  it('clears a flag once its field changes and keeps it cleared', () => {
    expect(visibleFlags(['totalStudents', 'pics'], new Set())).toEqual([
      'totalStudents',
      'pics',
    ]);
    expect(visibleFlags(['totalStudents', 'pics'], new Set(['totalStudents']))).toEqual([
      'pics',
    ]);
  });
});

describe('validation summary', () => {
  const form = formFromDraft(detail().form);

  it('links known server fields, including underscore ids', () => {
    const summary = issueSummary(
      [
        { field: 'activityStartDate', message: 'Enter the start date.' },
        { field: 'narrative', message: 'Enter the narrative.' },
      ],
      form,
    );

    expect(summary[0]).toMatchObject({
      label: 'Start date',
      targetId: 'wiz-startDate',
    });
    expect(summary[1].targetId).toBe('wiz-narrative');
  });

  it('keeps an unknown field message without inventing a link', () => {
    const summary = issueSummary([{ field: 'signature', message: 'Signature required.' }], form);
    expect(summary[0].targetId).toBeNull();
    expect(summary[0].label).toBe('signature');
  });
});

describe('attachment blocking', () => {
  const requirements = [
    {
      id: 'req1',
      activityType: 'OFF_CAMPUS' as const,
      label: 'Attendance sheet',
      minCount: 1,
      isRequired: true,
      isActive: true,
      isSeeded: true,
    },
  ];
  const form = formFromDraft(detail().form);

  const attachmentsItem = (attachments: readonly { label: string; status: AttachmentUiStatus }[]) =>
    completenessItems(form, requirements, attachments).find((item) => item.id === 'attachments');

  it('lists a missing required label in the page checklist without blocking', () => {
    expect(attachmentsItem([])?.missing).toEqual(['Attendance sheet']);
    expect(attachmentsItem([])?.complete).toBe(false);
    expect(attachmentBlockReason([])).toBeUndefined();
  });

  it('blocks while a file is still uploading', () => {
    expect(
      attachmentBlockReason([
        { label: 'Attendance sheet', status: 'CONFIRMED' },
        { label: '', status: 'UPLOADING' },
      ]),
    ).toContain('still uploading');
  });

  it('blocks a failed upload, and still counts its label as missing', () => {
    // A failed file is not on the server, so the requirement it was meant to
    // satisfy is unmet; the block reason names the upload itself.
    expect(attachmentBlockReason([{ label: 'Attendance sheet', status: 'FAILED' }])).toContain(
      'not uploaded',
    );
    expect(attachmentsItem([{ label: 'Attendance sheet', status: 'FAILED' }])?.missing).toEqual([
      'Attendance sheet',
    ]);
  });

  it('is complete only once every required label is confirmed', () => {
    const item = attachmentsItem([{ label: 'Attendance sheet', status: 'CONFIRMED' }]);
    expect(item?.missing).toEqual([]);
    expect(item?.complete).toBe(true);
    expect(item?.label).toBe('Attachments (1/1)');
  });
});

describe('form binding', () => {
  it('keeps typed dates readable for the editor', () => {
    const form = formFromDraft(detail().form);
    expect(form.startText).toBe('12 Mar 2026');
    expect(form.endDate).toBe('2026-03-13');
    expect(emptyWizardForm().startText).toBe('');
  });
});
