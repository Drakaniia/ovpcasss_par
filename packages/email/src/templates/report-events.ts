import { manilaDate, manilaDateTime, pluralDays } from '../format';
import { renderShell, type ShellAction } from '../shell';
import type { EmailContent } from '../provider';

/**
 * Workflow mail (email spec §5.1, §5.3). Every message is the same shape: one
 * sentence of what happened, the facts the recipient needs, at most one action,
 * and the office signature block from the shell.
 */
export interface ReportEventData {
  trackingNumber: string;
  title: string;
  /** Who caused the event; never shown for a return, which names the office instead. */
  actorName?: string | undefined;
  submitterName?: string | undefined;
  comments?: string | undefined;
  /** Origin of the app, so links work from the desktop shell and from mail. */
  origin?: string | undefined;
  receivedAt?: string | undefined;
  classification?: string | undefined;
  campus?: string | undefined;
  college?: string | undefined;
  revisionRound?: number | undefined;
  approvedAt?: string | undefined;
  waitingSince?: string | undefined;
  workingDays?: number | undefined;
  /** True only when the attachment is in this message (email spec §7.3). */
  hasAttachment?: boolean | undefined;
  /** The attachment was dropped for size, so the copy points at the app instead. */
  attachmentOmitted?: boolean | undefined;
}

function fact(label: string, value: string | undefined): { label: string; value: string } | null {
  return value ? { label, value } : null;
}

function facts(
  ...entries: ({ label: string; value: string | undefined } | null)[]
): { label: string; value: string }[] {
  return entries
    .filter((entry): entry is { label: string; value: string } => entry !== null)
    .map((entry) => ({ label: entry.label, value: entry.value }));
}

function action(data: ReportEventData, label: string, path: string): ShellAction | undefined {
  return data.origin ? { label, url: `${data.origin}${path}` } : undefined;
}

export function submittedTemplate(data: ReportEventData): EmailContent {
  return renderShell({
    subject: `${data.trackingNumber} is ready for review`,
    heading: 'A post-activity report is ready for review',
    intro: [
      'A post-activity report was submitted and is waiting for your review.',
      'Open the report to read the narrative and the supporting documents, then endorse it or return it with comments.',
    ],
    facts: facts(
      fact('Reference', data.trackingNumber),
      fact('Activity', data.title),
      fact('Submitter', data.submitterName ?? data.actorName),
      fact('Date received', data.receivedAt ? manilaDateTime(data.receivedAt) : undefined),
      fact('Classification', data.classification),
      fact('Campus or college', data.college ?? data.campus),
    ),
    ...(action(data, 'Open the review queue', '/review')
      ? { action: action(data, 'Open the review queue', '/review') }
      : {}),
    reference: data.trackingNumber,
  });
}

export function resubmittedTemplate(data: ReportEventData): EmailContent {
  return renderShell({
    subject: `${data.trackingNumber} was resubmitted`,
    heading: 'A revised report is ready for review',
    intro: [
      'A post-activity report was resubmitted after revision and is waiting for your review.',
      data.revisionRound && data.revisionRound > 1
        ? `This is revision round ${data.revisionRound}. The earlier comments are in the report's history.`
        : "The earlier comments are in the report's history.",
    ],
    facts: facts(
      fact('Reference', data.trackingNumber),
      fact('Activity', data.title),
      fact('Submitter', data.submitterName ?? data.actorName),
      fact('Date resubmitted', data.receivedAt ? manilaDateTime(data.receivedAt) : undefined),
    ),
    ...(action(data, 'Open the review queue', '/review')
      ? { action: action(data, 'Open the review queue', '/review') }
      : {}),
    reference: data.trackingNumber,
  });
}

export function receiptTemplate(data: ReportEventData): EmailContent {
  return renderShell({
    subject: `Submission received: ${data.trackingNumber}`,
    heading: 'Your report was received',
    intro: [
      `Your post-activity report was received and assigned the reference ${data.trackingNumber}. Keep this message as your record of filing.`,
      'The OVPCASSS reviewer will review the report and may return it with comments.',
      data.hasAttachment
        ? 'A copy of the report as filed is attached.'
        : data.attachmentOmitted
          ? 'The report as filed is large, so it is not attached. It is available in the app.'
          : '',
    ].filter(Boolean),
    facts: facts(
      fact('Reference', data.trackingNumber),
      fact('Activity', data.title),
      fact('Date and time received', data.receivedAt ? manilaDateTime(data.receivedAt) : undefined),
      fact('Status', 'Submitted'),
      fact('What happens next', 'A reviewer examines the report and may return it for revision.'),
    ),
    ...(action(data, 'View the report', `/reports/${data.trackingNumber}`)
      ? { action: action(data, 'View your report', '/reports') }
      : {}),
    reference: data.trackingNumber,
  });
}

export function returnedTemplate(data: ReportEventData): EmailContent {
  return renderShell({
    subject: `${data.trackingNumber} was returned for revision`,
    heading: 'Your report was returned for revision',
    intro: [
      'Your post-activity report was returned for revision.',
      'Revise the report as the comments describe, then resubmit it. The reference number does not change.',
    ],
    facts: facts(
      fact('Reference', data.trackingNumber),
      fact('Activity', data.title),
      fact('Returned by', data.actorName),
      fact('Date returned', data.receivedAt ? manilaDateTime(data.receivedAt) : undefined),
    ),
    ...(data.comments ? { quote: { label: 'Comments', body: data.comments } } : {}),
    ...(action(data, 'Revise the report', '/reports')
      ? { action: action(data, 'Revise the report', '/reports') }
      : {}),
    reference: data.trackingNumber,
  });
}

export function endorsedTemplate(data: ReportEventData): EmailContent {
  return renderShell({
    subject: `${data.trackingNumber} is ready for approval`,
    heading: 'A report is ready for your decision',
    intro: [
      'A post-activity report was endorsed and is waiting for your approval.',
      'Open the report to review it, then approve it or return it with comments.',
    ],
    facts: facts(
      fact('Reference', data.trackingNumber),
      fact('Activity', data.title),
      fact('Submitter', data.submitterName),
      fact('Endorsed by', data.actorName),
      fact('Date endorsed', data.receivedAt ? manilaDate(data.receivedAt) : undefined),
    ),
    ...(action(data, 'Open the approval queue', '/approval')
      ? { action: action(data, 'Open the approval queue', '/approval') }
      : {}),
    reference: data.trackingNumber,
  });
}

export function approvedTemplate(data: ReportEventData): EmailContent {
  return renderShell({
    subject: `${data.trackingNumber} is approved`,
    heading: 'Your report was approved',
    intro: [
      'Your post-activity report was approved.',
      data.hasAttachment
        ? 'The signed acknowledgement is attached.'
        : data.attachmentOmitted
          ? 'The signed acknowledgement is available in the app.'
          : '',
    ].filter(Boolean),
    facts: facts(
      fact('Reference', data.trackingNumber),
      fact('Activity', data.title),
      fact('Approved by', data.actorName),
      fact('Date approved', data.approvedAt ? manilaDate(data.approvedAt) : undefined),
    ),
    ...(action(data, 'View the report', '/reports')
      ? { action: action(data, 'View the report', '/reports') }
      : {}),
    reference: data.trackingNumber,
  });
}

export type ReminderQueue = 'review' | 'approval';

/** A nudge, not a reprimand: the count is the same working-day age the queue shows. */
export function reminderTemplate(data: ReportEventData & { queue: ReminderQueue }): EmailContent {
  const queue = data.queue === 'approval' ? 'approval' : 'review';
  const days = data.workingDays ?? 0;

  return renderShell({
    subject:
      queue === 'approval'
        ? `${data.trackingNumber} is still awaiting approval`
        : `${data.trackingNumber} is still awaiting review`,
    heading: 'A report is waiting on your queue',
    intro: [
      `This report has been waiting ${pluralDays(days)} in the ${queue} queue.`,
      'It remains in the queue until it is endorsed, approved, or returned with comments.',
    ],
    facts: facts(
      fact('Reference', data.trackingNumber),
      fact('Activity', data.title),
      fact('Submitter', data.submitterName),
      fact('Waiting since', data.waitingSince ? manilaDate(data.waitingSince) : undefined),
      fact('Working days waiting', pluralDays(days)),
    ),
    ...(action(data, `Open the ${queue} queue`, queue === 'approval' ? '/approval' : '/review')
      ? {
          action: action(
            data,
            `Open the ${queue} queue`,
            queue === 'approval' ? '/approval' : '/review',
          ),
        }
      : {}),
    reference: data.trackingNumber,
  });
}
