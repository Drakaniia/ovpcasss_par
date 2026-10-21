import type { EmailKind } from '@par/shared';

import type { EmailContent } from './provider';
import {
  accountActivatedTemplate,
  accountDisabledTemplate,
  resetPasswordTemplate,
  roleAssignedTemplate,
  verifyEmailTemplate,
} from './templates/account-events';
import { failureDigestTemplate, workbookTemplate } from './templates/operations';
import {
  approvedTemplate,
  endorsedTemplate,
  receiptTemplate,
  reminderTemplate,
  resubmittedTemplate,
  returnedTemplate,
  submittedTemplate,
  type ReportEventData,
} from './templates/report-events';

/**
 * One dataset per kind (email spec §6.1). The dev preview and the snapshot tests
 * read the same samples, so the copy is reviewed against the data it ships with.
 */
export interface EmailSample {
  kind: EmailKind;
  /** Who receives it, in the office's words. */
  audience: string;
  content: EmailContent;
}

export const SAMPLE_ORIGIN = 'https://par.buksu.edu.ph';

const REPORT: ReportEventData = {
  trackingNumber: 'OFF-2026-0014',
  title: 'Coastal cleanup and mangrove planting',
  actorName: 'J. Dela Cruz',
  submitterName: 'M. Santos',
  origin: SAMPLE_ORIGIN,
  receivedAt: '2026-10-13T02:14:25.000Z',
  classification: 'Non-curricular',
  campus: 'Malaybalay City Campus',
  college: 'College of Arts and Sciences',
  revisionRound: 2,
  approvedAt: '2026-10-20T06:05:00.000Z',
  waitingSince: '2026-10-12T01:00:00.000Z',
  workingDays: 4,
  hasAttachment: true,
};

const COMMENTS =
  'Add the attendance sheet and correct the participant count. The narrative also needs the date of the cleanup itself, not only the planning meeting.';

export function emailSamples(): EmailSample[] {
  return [
    {
      kind: 'SUBMITTED',
      audience: 'Every active Reviewer except the submitter',
      content: submittedTemplate(REPORT),
    },
    {
      kind: 'RECEIPT',
      audience: 'The submitter, on first submission only',
      content: receiptTemplate(REPORT),
    },
    {
      kind: 'RESUBMITTED',
      audience: 'Every active Reviewer except the submitter',
      content: resubmittedTemplate(REPORT),
    },
    {
      kind: 'RETURNED',
      audience: 'The submitter',
      content: returnedTemplate({ ...REPORT, comments: COMMENTS }),
    },
    {
      kind: 'ENDORSED',
      audience: 'Every active Approver except the actor',
      content: endorsedTemplate(REPORT),
    },
    {
      kind: 'APPROVED',
      audience: 'The submitter',
      content: approvedTemplate(REPORT),
    },
    {
      kind: 'REMINDER',
      audience: 'The holders of the queue that is holding the report',
      content: reminderTemplate({ ...REPORT, queue: 'review' }),
    },
    {
      kind: 'WORKBOOK',
      audience: 'Up to five institutional addresses',
      content: workbookTemplate({
        type: 'OFF_CAMPUS',
        schoolYear: '2026-2027',
        semester: 1,
        term: '1st Semester',
        reportCount: 12,
        generatedAt: '2026-10-21T01:30:00.000Z',
        generatedBy: 'A. Reyes',
        note: 'For the first semester filing.',
        hasAttachment: true,
      }),
    },
    {
      kind: 'FAILURE_DIGEST',
      audience: 'Every active Administrator',
      content: failureDigestTemplate({
        count: 2,
        failures: [
          {
            kind: 'RETURNED',
            to: 'm.santos@student.buksu.edu.ph',
            error: 'The domain is not verified',
          },
          {
            kind: 'REMINDER',
            to: 'j.delacruz@buksu.edu.ph',
            error: 'Mailbox unavailable',
          },
        ],
        origin: SAMPLE_ORIGIN,
      }),
    },
    {
      kind: 'VERIFY',
      audience: 'A newly registered account',
      content: verifyEmailTemplate({
        fullName: 'M. Santos',
        actionUrl: `${SAMPLE_ORIGIN}/verify-email?token=sample`,
      }),
    },
    {
      kind: 'RESET',
      audience: 'An account that asked for a reset',
      content: resetPasswordTemplate({
        fullName: 'M. Santos',
        actionUrl: `${SAMPLE_ORIGIN}/reset-password?token=sample`,
      }),
    },
    {
      kind: 'ROLE_ASSIGNED',
      audience: 'The account whose role changed',
      content: roleAssignedTemplate({
        fullName: 'J. Dela Cruz',
        roleLabel: 'Reviewer',
        roleDescription:
          'A Reviewer reads submitted reports and either endorses them to the approving officer or returns them with comments.',
        actionUrl: `${SAMPLE_ORIGIN}/login`,
      }),
    },
    {
      kind: 'ACCOUNT_ACTIVATED',
      audience: 'The account that was activated',
      content: accountActivatedTemplate({
        fullName: 'J. Dela Cruz',
        actionUrl: `${SAMPLE_ORIGIN}/login`,
      }),
    },
    {
      kind: 'ACCOUNT_DISABLED',
      audience: 'The account that was disabled',
      content: accountDisabledTemplate({ fullName: 'J. Dela Cruz' }),
    },
  ];
}

export function sampleFor(kind: EmailKind): EmailSample | null {
  return emailSamples().find((sample) => sample.kind === kind) ?? null;
}
