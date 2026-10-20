import type { ReportDetail, ReportHistoryEvent } from '@par/shared';
import { describe, expect, it } from 'vitest';

import { commentRounds, historyGroups, roundHeading } from './facsimile-history';
import { personRows, signatureBlock } from './facsimile-people';
import {
  acknowledgementIssue,
  pdfWatermark,
  separationNotice,
  stepperState,
  watermarkNote,
} from './facsimile-workflow';
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

describe('stepperState', () => {
  it('maps every API status onto the five stages', () => {
    const active = Object.fromEntries(
      (
        [
          'DRAFT',
          'SUBMITTED',
          'RESUBMITTED',
          'RETURNED_BY_REVIEWER',
          'ENDORSED',
          'RETURNED_BY_APPROVER',
          'APPROVED',
        ] as const
      ).map((status) => [status, stepperState(status).current]),
    );

    expect(active).toEqual({
      DRAFT: 0,
      SUBMITTED: 2,
      RESUBMITTED: 2,
      RETURNED_BY_REVIEWER: 2,
      ENDORSED: 3,
      RETURNED_BY_APPROVER: 3,
      APPROVED: 4,
    });
  });

  it('marks earlier stages complete and later stages upcoming', () => {
    expect(stepperState('ENDORSED').states).toEqual([
      'complete',
      'complete',
      'complete',
      'current',
      'upcoming',
    ]);
  });

  it('adds a maroon Returned chip linking to the comment, and a Resubmitted chip', () => {
    expect(stepperState('RETURNED_BY_REVIEWER').chip).toEqual({
      label: 'Returned',
      tone: 'danger',
      href: '#review-history',
    });
    expect(stepperState('RESUBMITTED').chip).toEqual({
      label: 'Resubmitted',
      tone: 'info',
      href: null,
    });
    expect(stepperState('SUBMITTED').chip).toBeNull();
  });

  it('never renders the five stages as color alone', () => {
    expect(stepperState('SUBMITTED').states.filter((state) => state === 'upcoming')).toHaveLength(
      2,
    );
  });
});

describe('workflow copy', () => {
  it('watermarks every non-approved PDF', () => {
    expect(pdfWatermark('APPROVED')).toBe('NONE');
    expect(pdfWatermark('DRAFT')).toBe('DRAFT');
    expect(pdfWatermark('ENDORSED')).toBe('NOT_APPROVED');
    expect(watermarkNote('APPROVED')).toBeNull();
    expect(watermarkNote('DRAFT')).toBe('The download carries a DRAFT watermark.');
    expect(watermarkNote('SUBMITTED')).toBe('The download carries a NOT APPROVED watermark.');
  });

  it('explains a missing approval signature instead of generating a blank block', () => {
    expect(acknowledgementIssue(detail({ status: 'SUBMITTED' }))).toBeNull();
    expect(acknowledgementIssue(detail({ status: 'APPROVED' }))).toMatch(
      /signature is not on file/,
    );
    expect(
      acknowledgementIssue(
        detail({
          status: 'APPROVED',
          approval: {
            signerName: 'A. Reyes',
            signedAt: '2026-03-20T01:00:00.000Z',
            signatureUrl: 'https://signed.example/sig.png',
          },
        }),
      ),
    ).toBeNull();
  });

  it('states the separation-of-duties reason for a submitter who reviews or approves', () => {
    expect(
      separationNotice({
        status: 'SUBMITTED',
        ownerUserId: 'u1',
        userId: 'u1',
        role: 'REVIEWER',
      }),
    ).toBe('You submitted this report. A reviewer cannot endorse a report they submitted.');

    expect(
      separationNotice({
        status: 'ENDORSED',
        ownerUserId: 'u1',
        userId: 'u1',
        role: 'APPROVER',
      }),
    ).toBe('You submitted this report. An approver cannot approve a report they submitted.');

    expect(
      separationNotice({
        status: 'SUBMITTED',
        ownerUserId: 'u2',
        userId: 'u1',
        role: 'REVIEWER',
      }),
    ).toBeNull();
  });
});

describe('historyGroups', () => {
  const events: ReportHistoryEvent[] = [
    {
      at: '2026-03-15T02:40:00.000Z',
      actorName: 'M. Santos',
      actorRole: 'REVIEWER',
      action: 'Endorsed',
      fromStatus: 'SUBMITTED',
      toStatus: 'ENDORSED',
      comment: 'Endorsed for approval.',
    },
    {
      at: '2026-03-14T01:12:00.000Z',
      actorName: 'J. Dela Cruz',
      actorRole: 'SUBMITTER',
      action: 'Submitted',
      fromStatus: 'DRAFT',
      toStatus: 'SUBMITTED',
    },
    {
      at: '2026-03-14T09:12:00.000Z',
      actorName: 'M. Santos',
      actorRole: 'REVIEWER',
      action: 'Returned',
      fromStatus: 'SUBMITTED',
      toStatus: 'RETURNED_BY_REVIEWER',
    },
  ];

  it('groups by Manila day, ascending, and marks the latest event Current', () => {
    const groups = historyGroups(events);

    expect(groups.map((group) => group.day)).toEqual(['14 Mar 2026', '15 Mar 2026']);
    expect(groups[0].entries.map((entry) => entry.action)).toEqual(['Submitted', 'Returned']);
    expect(groups[1].entries[0].current).toBe(true);
    expect(groups[0].entries.some((entry) => entry.current)).toBe(false);
  });

  it('shows actor, role, status change, and a comment excerpt', () => {
    const entry = historyGroups(events)[1].entries[0];

    expect(entry).toMatchObject({
      actorName: 'M. Santos',
      roleLabel: 'Reviewer',
      action: 'Endorsed',
      statusChange: 'Submitted → Endorsed',
      comment: 'Endorsed for approval.',
    });
  });

  it('truncates long comments with an ellipsis', () => {
    const long =
      historyGroups([
        {
          at: '2026-03-14T01:12:00.000Z',
          actorName: 'M. Santos',
          actorRole: 'REVIEWER',
          action: 'Returned',
          comment: 'x'.repeat(400),
        },
      ])[0].entries[0].comment ?? '';

    expect(long).toHaveLength(161);
    expect(long.endsWith('…')).toBe(true);
  });
});

describe('commentRounds', () => {
  it('falls back to the latest return when the API does not send every round', () => {
    const rounds = commentRounds(
      detail({
        status: 'RETURNED_BY_REVIEWER',
        returnEvent: {
          round: 1,
          comments: 'Add the attendance sheet.',
          authorName: 'M. Santos',
          authorRole: 'REVIEWER',
          createdAt: '2026-03-15T02:40:00.000Z',
        },
      }),
    );

    expect(rounds).toHaveLength(1);
    expect(roundHeading(rounds[0])).toBe('Round 1 — returned by M. Santos (Reviewer), 15 Mar 2026');
  });

  it('sorts supplied rounds and keeps their order', () => {
    const rounds = commentRounds(
      detail({
        commentRounds: [
          {
            round: 2,
            authorName: 'A. Reyes',
            authorRole: 'APPROVER',
            createdAt: '2026-03-18T00:00:00.000Z',
            comments: 'Second.',
          },
          {
            round: 1,
            authorName: 'M. Santos',
            authorRole: 'REVIEWER',
            createdAt: '2026-03-15T00:00:00.000Z',
            comments: 'First.',
          },
        ],
      }),
    );

    expect(rounds.map((round) => round.round)).toEqual([1, 2]);
  });

  it('has no rounds on a report that was never returned', () => {
    expect(commentRounds(detail())).toEqual([]);
  });
});

describe('people and signatures', () => {
  it('lists submitter, reviewer, and approver in that order when known', () => {
    expect(personRows(detail()).map((row) => row.role)).toEqual(['SUBMITTER', 'REVIEWER']);

    expect(
      personRows(
        detail({
          people: {
            submitter: { fullName: 'J. Dela Cruz', role: 'SUBMITTER' },
            approver: { fullName: 'A. Reyes', role: 'APPROVER' },
          },
        }),
      ).map((row) => row.name),
    ).toEqual(['J. Dela Cruz', 'A. Reyes']);
  });

  it('falls back to the audit timeline and omits roles that never acted', () => {
    const rows = personRows(
      detail({
        people: undefined,
        history: [
          {
            at: '2026-03-14T01:12:00.000Z',
            actorName: 'J. Dela Cruz',
            actorRole: 'SUBMITTER',
            action: 'Submitted',
          },
        ],
      }),
    );

    expect(rows).toEqual([
      {
        role: 'SUBMITTER',
        name: 'J. Dela Cruz',
        roleLabel: 'Submitter',
        actedAt: '2026-03-14T01:12:00.000Z',
      },
    ]);
  });

  it('keeps the approved-by block blank until the report is approved', () => {
    expect(signatureBlock(detail()).approvedBy).toBeUndefined();

    const approved = signatureBlock(
      detail({
        status: 'APPROVED',
        approval: {
          signerName: 'A. Reyes',
          signedAt: '2026-03-20T01:00:00.000Z',
          signatureUrl: 'https://signed.example/sig.png',
        },
      }),
    );

    expect(approved).toMatchObject({
      submittedBy: 'J. Dela Cruz',
      approvedBy: 'A. Reyes',
      signatureUrl: 'https://signed.example/sig.png',
    });
  });
});
