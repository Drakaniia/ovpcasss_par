import type { QueueItem, ReportDetail } from '@par/shared';
import { describe, expect, it } from 'vitest';

import { ApiError } from '$lib/api/http';

import {
  decisionAvailability,
  decisionSubjectFromDetail,
  decisionSubjectFromItem,
  decisionSpec,
  isDecisionConflict,
  isUploading,
  validateDecisionComment,
} from './queue-decisions';

const item = (overrides: Partial<QueueItem> = {}): QueueItem => ({
  id: 'r1',
  ownerUserId: 'u1',
  submitterName: 'M. Santos',
  trackingNumber: 'OFF-2026-0014',
  title: 'Coastal cleanup',
  type: 'OFF_CAMPUS',
  status: 'SUBMITTED',
  campusId: 'c1',
  collegeId: 'un1',
  college: 'College of Arts and Sciences',
  waitingSince: '2026-03-13T02:00:00.000Z',
  hasPendingAttachments: false,
  ...overrides,
});

const detail = (overrides: Partial<ReportDetail> = {}): ReportDetail =>
  ({
    id: 'r1',
    ownerUserId: 'u1',
    trackingNumber: 'OFF-2026-0014',
    status: 'ENDORSED',
    version: 3,
    updatedAt: '2026-03-14T01:12:00.000Z',
    form: { title: 'Coastal cleanup' },
    attachments: [],
    people: { submitter: { fullName: 'M. Santos', role: 'SUBMITTER' } },
    ...overrides,
  }) as ReportDetail;

const reviewer = { userId: 'u9', role: 'REVIEWER' as const };
const approver = { userId: 'u9', role: 'APPROVER' as const };

describe('decision availability', () => {
  it('offers Endorse and Return to a reviewer on a submitted report', () => {
    const availability = decisionAvailability(decisionSubjectFromItem(item(), 'review'), reviewer);

    expect(availability.blocked).toBeNull();
    expect(availability.buttons.map((button) => button.action)).toEqual(['ENDORSE', 'RETURN']);
    expect(availability.buttons.every((button) => button.enabled)).toBe(true);
    expect(availability.buttons[0].tone).toBe('primary');
    expect(availability.buttons[1].tone).toBe('danger');
  });

  it('offers the same reviewer buttons on a resubmitted report', () => {
    const resubmitted = item({ status: 'RESUBMITTED' });
    const availability = decisionAvailability(
      decisionSubjectFromItem(resubmitted, 'review'),
      reviewer,
    );

    expect(availability.buttons.every((button) => button.enabled)).toBe(true);
  });

  it('offers Approve and Return to an approver on an endorsed report', () => {
    const endorsed = item({ status: 'ENDORSED' });
    const availability = decisionAvailability(
      decisionSubjectFromItem(endorsed, 'approval'),
      approver,
    );

    expect(availability.buttons.map((button) => button.action)).toEqual(['APPROVE', 'RETURN']);
    expect(availability.blocked).toBeNull();
  });

  it('tells the reviewer when the report is no longer waiting', () => {
    const endorsed = item({ status: 'ENDORSED' });
    const availability = decisionAvailability(
      decisionSubjectFromItem(endorsed, 'review'),
      reviewer,
    );

    expect(availability.buttons).toEqual([]);
    expect(availability.blocked).toBe('This report is no longer awaiting your review.');
  });

  it('disables both buttons for a report the viewer submitted', () => {
    const own = item({ ownerUserId: 'u9' });
    const availability = decisionAvailability(decisionSubjectFromItem(own, 'review'), reviewer);

    expect(availability.buttons.every((button) => !button.enabled)).toBe(true);
    expect(availability.buttons[0].reason).toBe(
      'You submitted this report. A reviewer cannot act on a report they submitted.',
    );
  });

  it('names the approver in the separation reason on the approval queue', () => {
    const own = item({ ownerUserId: 'u9', status: 'ENDORSED' });
    const availability = decisionAvailability(decisionSubjectFromItem(own, 'approval'), approver);

    expect(availability.buttons[0].reason).toBe(
      'You submitted this report. An approver cannot act on a report they submitted.',
    );
  });

  it('blocks a decision while an attachment is still uploading', () => {
    const uploading = item({ hasPendingAttachments: true });
    const availability = decisionAvailability(
      decisionSubjectFromItem(uploading, 'review'),
      reviewer,
    );

    expect(availability.buttons.every((button) => !button.enabled)).toBe(true);
    expect(availability.buttons[0].reason).toBe('Attachments are still uploading.');
  });

  it('blocks a role that does not belong to the queue', () => {
    const availability = decisionAvailability(decisionSubjectFromItem(item(), 'review'), approver);

    expect(availability.buttons).toEqual([]);
    expect(availability.blocked).toBe('This queue is for reviewers.');
  });
});

describe('decision subjects', () => {
  it('reads the submitter name and pending attachments from the report', () => {
    const subject = decisionSubjectFromDetail(detail(), 'approval');

    expect(subject.submitterName).toBe('M. Santos');
    expect(subject.facsimileHref).toBe('/approval/r1');
    expect(subject.hasPendingAttachments).toBe(false);
  });

  it('falls back when the API omits the submitter, rather than rendering a blank', () => {
    const subject = decisionSubjectFromDetail(detail({ people: undefined }), 'approval');

    expect(subject.submitterName).toBe('the submitter');
  });

  it('detects an upload still in flight', () => {
    expect(isUploading(detail())).toBe(false);
    expect(
      isUploading(
        detail({
          attachments: [
            {
              id: 'a1',
              reportId: 'r1',
              label: 'Narrative',
              originalName: 'n.pdf',
              mimeType: 'application/pdf',
              size: 12,
              status: 'PENDING',
            },
          ],
        }),
      ),
    ).toBe(true);
  });
});

describe('decision copy', () => {
  it('names the action and the submitter on a return', () => {
    const spec = decisionSpec('RETURN', decisionSubjectFromItem(item(), 'review'));

    expect(spec.title).toBe('Return report');
    expect(spec.subtitle).toBe('OFF-2026-0014 · Coastal cleanup');
    expect(spec.consequence).toContain('M. Santos');
    expect(spec.confirmLabel).toBe('Return report');
    expect(spec.tone).toBe('danger');
    expect(spec.commentRequired).toBe(true);
    expect(spec.notifyOption).toBe('Notify submitter by email');
    expect(spec.successToast).toBe('Report returned');
  });

  it('keeps endorse and approve navy with an optional note', () => {
    const endorse = decisionSpec('ENDORSE', decisionSubjectFromItem(item(), 'review'));
    const approve = decisionSpec('APPROVE', decisionSubjectFromItem(item(), 'review'));

    expect(endorse.tone).toBe('primary');
    expect(endorse.commentOptional).toBe(true);
    expect(endorse.notifyOption).toBeNull();
    expect(endorse.successToast).toBe('Report endorsed');
    expect(approve.tone).toBe('primary');
    expect(approve.successToast).toBe('Report approved');
    expect(approve.requiresSignature).toBe(true);
  });
});

describe('decision validation', () => {
  it('requires a return comment', () => {
    const errors = validateDecisionComment('RETURN', { note: '   ', notifySubmitter: true });

    expect(errors.comments).toBe('Enter a comment before returning the report.');
  });

  it('caps the return comment at 4000 characters', () => {
    expect(
      validateDecisionComment('RETURN', { note: 'a'.repeat(4000), notifySubmitter: true }),
    ).toEqual({});
    expect(
      validateDecisionComment('RETURN', { note: 'a'.repeat(4001), notifySubmitter: true }).comments,
    ).toBe('Use 4000 characters or fewer.');
  });

  it('accepts an empty optional note', () => {
    expect(validateDecisionComment('ENDORSE', { note: '  ', notifySubmitter: true })).toEqual({});
    expect(
      validateDecisionComment('APPROVE', { note: 'Received.', notifySubmitter: true }),
    ).toEqual({});
  });
});

describe('lost races', () => {
  it('reads a 409 or a pending-state code as someone else deciding', () => {
    expect(isDecisionConflict(new ApiError(409, 'CONFLICT', 'Already decided'))).toBe(true);
    expect(isDecisionConflict(new ApiError(400, 'REPORT_NOT_PENDING', 'No longer pending'))).toBe(
      true,
    );
    expect(isDecisionConflict(new ApiError(500, 'INTERNAL', 'Failed'))).toBe(false);
    expect(isDecisionConflict(new Error('offline'))).toBe(false);
  });
});
