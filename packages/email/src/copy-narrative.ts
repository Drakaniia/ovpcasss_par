import type { EmailActionVariant, EmailTemplateCopy } from '@par/shared';

const paragraph = (text: string, when: string | null = null) => ({ text, when });
const fact = (label: string, token: string) => ({ label, value: `{{${token}}}` });
const button = (label: string, token: string, when: string | null = null): EmailActionVariant => ({
  when,
  label,
  urlToken: `{{${token}}}`,
});

/**
 * The built-in copy for the nine report and personnel messages (email spec §5).
 * These strings are the ones the templates carried before the copy layer; the
 * snapshot tests compare against the same fixtures, so they must stay identical.
 */
export const NARRATIVE_COPY: Record<
  'ASSIGNED' | 'SUBMITTED' | 'RETURNED' | 'APPROVED' | 'RECEIPT_ISSUED' | 'RECORD_EDITED' | 'REMINDER' | 'PIC_REMOVED',
  EmailTemplateCopy
> = {
  ASSIGNED: {
    subject: '{{referenceNo}} — you are the personnel in charge',
    heading: 'You are the personnel in charge',
    greeting: 'Good day.',
    intro: [
      paragraph(
        'The OVPCASSS office registered an activity and named you as the personnel in charge under {{referenceNo}}.',
      ),
      paragraph(
        'An account was created for this email address. Confirm the address, sign in, and write the narrative report for this activity.',
        'newAccount',
      ),
      paragraph(
        'Open your dashboard to write and submit the narrative report for this activity.',
        'existingAccount',
      ),
      paragraph(
        'The activity details are read-only. Only the narrative and its supporting documents are yours to complete.',
      ),
    ],
    facts: {
      enabled: true,
      source: 'fixed',
      rows: [
        fact('Reference', 'referenceNo'),
        fact('Activity', 'title'),
        fact('Date', 'activityDate'),
        fact('Location', 'location'),
      ],
    },
    quote: null,
    action: {
      enabled: true,
      variants: [
        button('Create your account', 'registerUrl', 'newAccount'),
        button('Open your dashboard', 'dashboardUrl', 'existingAccount'),
      ],
    },
    footer: { enabled: true, reference: '{{referenceNo}}', note: '', replyNotice: true },
  },

  SUBMITTED: {
    subject: '{{referenceNo}} — narrative report ready for review',
    heading: 'A narrative report is ready for your review',
    greeting: 'Good day.',
    intro: [
      paragraph('{{submitterNameFallback}} submitted the narrative report for {{referenceNo}}.'),
      paragraph(
        'Read the narrative and its supporting documents, then approve it or return it with comments.',
      ),
    ],
    facts: {
      enabled: true,
      source: 'fixed',
      rows: [
        fact('Reference', 'referenceNo'),
        fact('Activity', 'title'),
        fact('Personnel in charge', 'submitterName'),
        fact('Submitted', 'submittedAt'),
      ],
    },
    quote: null,
    action: { enabled: true, variants: [button('Open the reports queue', 'reportsQueueUrl')] },
    footer: { enabled: true, reference: '{{referenceNo}}', note: '', replyNotice: true },
  },

  RETURNED: {
    subject: '{{referenceNo}} — narrative report returned for revision',
    heading: 'Your narrative report was returned',
    greeting: 'Good day.',
    intro: [
      paragraph('The office returned the narrative report for {{referenceNo}} with comments.'),
      paragraph('Revise the narrative, then submit it again.'),
    ],
    facts: {
      enabled: true,
      source: 'fixed',
      rows: [fact('Reference', 'referenceNo'), fact('Activity', 'title')],
    },
    quote: { enabled: true, label: 'Comments from the office', body: '{{comments}}' },
    action: { enabled: true, variants: [button('Revise the narrative', 'dashboardUrl')] },
    footer: { enabled: true, reference: '{{referenceNo}}', note: '', replyNotice: true },
  },

  APPROVED: {
    subject: '{{referenceNo}} — narrative report approved',
    heading: 'Your narrative report was approved',
    greeting: 'Good day.',
    intro: [
      paragraph('The office approved the narrative report for {{referenceNo}}.'),
      paragraph(
        'The acknowledgment receipt (OVPCASSS-F-013) is issued as a separate document and stays available in the app.',
      ),
    ],
    facts: {
      enabled: true,
      source: 'fixed',
      rows: [
        fact('Reference', 'referenceNo'),
        fact('Activity', 'title'),
        fact('Personnel in charge', 'picName'),
        fact('Approved', 'approvedDate'),
      ],
    },
    quote: null,
    action: { enabled: true, variants: [button('Open your dashboard', 'dashboardUrl')] },
    footer: { enabled: true, reference: '{{referenceNo}}', note: '', replyNotice: true },
  },

  RECEIPT_ISSUED: {
    subject: '{{referenceNo}} — acknowledgment receipt',
    heading: 'Your acknowledgment receipt is ready',
    greeting: 'Good day.',
    intro: [
      paragraph(
        'The office approved the narrative report for {{referenceNo}}, and the acknowledgment receipt is attached.',
      ),
      paragraph('Keep this message as your record of the completed report.', 'attached'),
      paragraph('The attached copy was too large for mail; download it from the app instead.', 'omitted'),
      paragraph('Download the receipt from the app.', 'none'),
    ],
    facts: {
      enabled: true,
      source: 'fixed',
      rows: [
        fact('Reference', 'referenceNo'),
        fact('Activity', 'title'),
        fact('Personnel in charge', 'picName'),
        fact('Approved', 'approvedDate'),
      ],
    },
    quote: null,
    action: { enabled: true, variants: [button('Download the receipt', 'dashboardUrl')] },
    footer: { enabled: true, reference: '{{referenceNo}}', note: '', replyNotice: true },
  },

  RECORD_EDITED: {
    subject: '{{referenceNo}} — activity details corrected',
    heading: 'The activity details were corrected',
    greeting: 'Good day.',
    intro: [
      paragraph(
        'The office corrected the activity details for {{referenceNo}} after the narrative report was submitted.',
      ),
      paragraph(
        'The narrative, its attachments, and your signature were not changed. Open the record to work from the current version.',
      ),
    ],
    facts: {
      enabled: true,
      source: 'fixed',
      rows: [
        fact('Reference', 'referenceNo'),
        fact('Activity', 'title'),
        fact('Corrected fields', 'changedFields'),
      ],
    },
    quote: { enabled: true, label: 'Reason for the correction', body: '{{reason}}' },
    action: { enabled: true, variants: [button('Open the record', 'dashboardUrl')] },
    footer: { enabled: true, reference: '{{referenceNo}}', note: '', replyNotice: true },
  },

  REMINDER: {
    subject: '{{referenceNo}} — narrative report still pending',
    heading: 'The narrative report is still pending',
    greeting: 'Good day.',
    intro: [
      paragraph(
        '{{referenceNo}} was assigned to you {{waitingDays}} days ago, and the narrative report has not been submitted.',
        'withWaitingDays',
      ),
      paragraph(
        '{{referenceNo}} was assigned to you, and the narrative report has not been submitted.',
        'withoutWaitingDays',
      ),
      paragraph('Open the record to write the narrative and its supporting documents.'),
    ],
    facts: {
      enabled: true,
      source: 'fixed',
      rows: [
        fact('Reference', 'referenceNo'),
        fact('Activity', 'title'),
        fact('Date', 'activityDate'),
        fact('Location', 'location'),
      ],
    },
    quote: null,
    action: { enabled: true, variants: [button('Write the narrative', 'dashboardUrl')] },
    footer: { enabled: true, reference: '{{referenceNo}}', note: '', replyNotice: true },
  },

  PIC_REMOVED: {
    subject: '{{referenceNo}} — removed as personnel in charge',
    heading: 'You were removed as personnel in charge',
    greeting: 'Good day.',
    intro: [
      paragraph('The office removed you as personnel in charge for {{referenceNo}}.'),
      paragraph('You no longer have access to that record. Contact the office if this was not intended.'),
    ],
    facts: {
      enabled: true,
      source: 'fixed',
      rows: [fact('Reference', 'referenceNo'), fact('Activity', 'title')],
    },
    quote: null,
    action: null,
    footer: { enabled: true, reference: '{{referenceNo}}', note: '', replyNotice: true },
  },
};
