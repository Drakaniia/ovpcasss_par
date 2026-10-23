import { manilaDate, manilaDateTime } from '../format';
import { renderShell, type ShellAction } from '../shell';
import type { EmailContent } from '../provider';

/** The facts every narrative mail carries (spec §11). */
export interface NarrativeEventData {
  referenceNo: string;
  title: string;
  activityDate?: string | undefined;
  location?: string | undefined;
  picName?: string | undefined;
  submitterName?: string | undefined;
  comments?: string | undefined;
  approvedAt?: string | undefined;
  waitingDays?: number | undefined;
  /** Labels of the activity fields the office corrected (spec §9). */
  changedFields?: readonly string[] | undefined;
  reason?: string | undefined;
  origin?: string | undefined;
  /** True only when the receipt PDF is in this message. */
  hasAttachment?: boolean | undefined;
  attachmentOmitted?: boolean | undefined;
  /** The recipient had no account before the assignment. */
  newAccount?: boolean | undefined;
}

function action(data: NarrativeEventData, label: string, path: string): ShellAction | undefined {
  return data.origin ? { label, url: `${data.origin}${path}` } : undefined;
}

function facts(
  ...entries: ({ label: string; value: string | undefined } | null)[]
): { label: string; value: string }[] {
  return entries
    .filter((entry): entry is { label: string; value: string } => entry !== null)
    .map((entry) => ({ label: entry.label, value: entry.value }));
}

function fact(label: string, value: string | undefined) {
  return value ? { label, value } : null;
}

export function assignedTemplate(data: NarrativeEventData): EmailContent {
  const link = action(
    data,
    data.newAccount ? 'Create your account' : 'Open your dashboard',
    data.newAccount ? '/register' : '/',
  );

  return renderShell({
    subject: `${data.referenceNo} — you are the personnel in charge`,
    heading: 'You are the personnel in charge',
    intro: [
      `The OVPCASSS office registered an activity and named you as the personnel in charge under ${data.referenceNo}.`,
      data.newAccount
        ? 'An account was created for this email address. Confirm the address, sign in, and write the narrative report for this activity.'
        : 'Open your dashboard to write and submit the narrative report for this activity.',
      'The activity details are read-only. Only the narrative and its supporting documents are yours to complete.',
    ],
    facts: facts(
      fact('Reference', data.referenceNo),
      fact('Activity', data.title),
      fact('Date', data.activityDate ? manilaDate(data.activityDate) : undefined),
      fact('Location', data.location),
    ),
    ...(link ? { action: link } : {}),
    reference: data.referenceNo,
  });
}

export function submittedTemplate(data: NarrativeEventData): EmailContent {
  const link = action(data, 'Open the reports queue', '/reports?tab=submitted');

  return renderShell({
    subject: `${data.referenceNo} — narrative report ready for review`,
    heading: 'A narrative report is ready for your review',
    intro: [
      `${data.submitterName ?? 'The personnel in charge'} submitted the narrative report for ${data.referenceNo}.`,
      'Read the narrative and its supporting documents, then approve it or return it with comments.',
    ],
    facts: facts(
      fact('Reference', data.referenceNo),
      fact('Activity', data.title),
      fact('Personnel in charge', data.submitterName),
      fact('Submitted', data.approvedAt ? manilaDateTime(data.approvedAt) : undefined),
    ),
    ...(link ? { action: link } : {}),
    reference: data.referenceNo,
  });
}

export function returnedTemplate(data: NarrativeEventData): EmailContent {
  const link = action(data, 'Revise the narrative', '/');

  return renderShell({
    subject: `${data.referenceNo} — narrative report returned for revision`,
    heading: 'Your narrative report was returned',
    intro: [
      `The office returned the narrative report for ${data.referenceNo} with comments.`,
      'Revise the narrative, then submit it again.',
    ],
    facts: facts(fact('Reference', data.referenceNo), fact('Activity', data.title)),
    quote: data.comments ? { label: 'Comments from the office', body: data.comments } : undefined,
    ...(link ? { action: link } : {}),
    reference: data.referenceNo,
  });
}

export function receiptIssuedTemplate(data: NarrativeEventData): EmailContent {
  const link = action(data, 'Download the receipt', '/');

  return renderShell({
    subject: `${data.referenceNo} — acknowledgment receipt`,
    heading: 'Your acknowledgment receipt is ready',
    intro: [
      `The office approved the narrative report for ${data.referenceNo}, and the acknowledgment receipt is attached.`,
      data.hasAttachment
        ? 'Keep this message as your record of the completed report.'
        : data.attachmentOmitted
          ? 'The attached copy was too large for mail; download it from the app instead.'
          : 'Download the receipt from the app.',
    ],
    facts: facts(
      fact('Reference', data.referenceNo),
      fact('Activity', data.title),
      fact('Personnel in charge', data.picName),
      fact('Approved', data.approvedAt ? manilaDate(data.approvedAt) : undefined),
    ),
    ...(link ? { action: link } : {}),
    reference: data.referenceNo,
  });
}

export function reminderTemplate(data: NarrativeEventData): EmailContent {
  const link = action(data, 'Write the narrative', '/');

  return renderShell({
    subject: `${data.referenceNo} — narrative report still pending`,
    heading: 'The narrative report is still pending',
    intro: [
      `${data.referenceNo} was assigned to you${data.waitingDays ? ` ${data.waitingDays} days ago` : ''}, and the narrative report has not been submitted.`,
      'Open the record to write the narrative and its supporting documents.',
    ],
    facts: facts(
      fact('Reference', data.referenceNo),
      fact('Activity', data.title),
      fact('Date', data.activityDate ? manilaDate(data.activityDate) : undefined),
      fact('Location', data.location),
    ),
    ...(link ? { action: link } : {}),
    reference: data.referenceNo,
  });
}

export function recordEditedTemplate(data: NarrativeEventData): EmailContent {
  const link = action(data, 'Open the record', '/');

  return renderShell({
    subject: `${data.referenceNo} — activity details corrected`,
    heading: 'The activity details were corrected',
    intro: [
      `The office corrected the activity details for ${data.referenceNo} after the narrative report was submitted.`,
      'The narrative, its attachments, and your signature were not changed. Open the record to work from the current version.',
    ],
    facts: facts(
      fact('Reference', data.referenceNo),
      fact('Activity', data.title),
      fact('Corrected fields', data.changedFields?.join(', ')),
    ),
    quote: data.reason ? { label: 'Reason for the correction', body: data.reason } : undefined,
    ...(link ? { action: link } : {}),
    reference: data.referenceNo,
  });
}

export function picRemovedTemplate(data: NarrativeEventData): EmailContent {
  return renderShell({
    subject: `${data.referenceNo} — removed as personnel in charge`,
    heading: 'You were removed as personnel in charge',
    intro: [
      `The office removed you as personnel in charge for ${data.referenceNo}.`,
      'You no longer have access to that record. Contact the office if this was not intended.',
    ],
    facts: facts(fact('Reference', data.referenceNo), fact('Activity', data.title)),
    reference: data.referenceNo,
  });
}
