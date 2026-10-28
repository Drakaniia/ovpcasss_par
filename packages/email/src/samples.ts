import type { EmailKind } from '@par/shared';

import type { EmailContent } from './provider';
import {
  accountActivatedTemplate,
  accountDisabledTemplate,
  resetPasswordTemplate,
  roleAssignedTemplate,
  verifyEmailTemplate,
} from './templates/account-events';
import {
  approvedTemplate,
  assignedTemplate,
  picRemovedTemplate,
  receiptIssuedTemplate,
  recordEditedTemplate,
  reminderTemplate,
  returnedTemplate,
  submittedTemplate,
  type NarrativeEventData,
} from './templates/narrative-events';
import { failureDigestTemplate, workbookTemplate } from './templates/operations';

export interface EmailSample {
  kind: EmailKind;
  audience: string;
  content: EmailContent;
}

export const SAMPLE_ORIGIN = 'https://par.buksu.edu.ph';

const RECORD: NarrativeEventData = {
  referenceNo: 'AR No. 0001',
  title: 'Coastal cleanup and mangrove planting',
  activityDate: '2026-10-21',
  location: 'Brgy. Poblacion, Malaybalay City',
  picName: 'M. Santos',
  submitterName: 'M. Santos',
  approvedAt: '2026-10-22T06:05:00.000Z',
  waitingDays: 7,
  origin: SAMPLE_ORIGIN,
  hasAttachment: true,
};

const COMMENTS = 'Add the attendance sheet and correct the participant count.';

export function emailSamples(): EmailSample[] {
  return [
    {
      kind: 'ASSIGNED',
      audience: 'Every personnel in charge named on the record',
      content: assignedTemplate(RECORD),
    },
    {
      kind: 'SUBMITTED',
      audience: 'The office',
      content: submittedTemplate(RECORD),
    },
    {
      kind: 'RETURNED',
      audience: 'Every personnel in charge named on the record',
      content: returnedTemplate({ ...RECORD, comments: COMMENTS }),
    },
    {
      kind: 'APPROVED',
      audience: 'Every personnel in charge named on the record',
      content: approvedTemplate(RECORD),
    },
    {
      kind: 'RECEIPT_ISSUED',
      audience: 'Each personnel in charge, with their own receipt attached',
      content: receiptIssuedTemplate(RECORD),
    },
    {
      kind: 'RECORD_EDITED',
      audience: 'Every personnel in charge named on the record',
      content: recordEditedTemplate({
        ...RECORD,
        changedFields: ['Activity title', 'Location'],
        reason: 'The location was entered as the venue office instead of the activity site.',
      }),
    },
    {
      kind: 'REMINDER',
      audience: 'Personnel in charge who have not submitted',
      content: reminderTemplate(RECORD),
    },
    {
      kind: 'PIC_REMOVED',
      audience: 'The person removed from the record',
      content: picRemovedTemplate(RECORD),
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
        roleLabel: 'Personnel',
        roleDescription:
          'Personnel in charge write and submit the narrative report for each activity assigned to them.',
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
