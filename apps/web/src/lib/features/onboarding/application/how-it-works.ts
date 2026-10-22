import type { ReportStatus } from '@par/shared';

/**
 * The workflow explainer (UI spec §4.2, project spec §7.5). Four readable
 * stages, each anchored to the API statuses it covers — the seven statuses in
 * `REPORT_STATUSES` appear here exactly once, so the screen can never invent a
 * state the machine does not have. A test holds that invariant.
 */

export type WorkflowStageKey = 'prepare' | 'submit' | 'review' | 'approve';

export interface WorkflowStage {
  key: WorkflowStageKey;
  /** The step name in the institutional voice. */
  title: string;
  /** Who acts at this stage. */
  owner: string;
  summary: string;
  /** What happens, in reading order. */
  points: readonly string[];
  /** The API statuses this stage produces. */
  statuses: readonly ReportStatus[];
  /** What the people involved receive by email. */
  mail: string;
  /** One sentence the reader should remember. */
  note: string;
}

export const WORKFLOW_STAGES: readonly WorkflowStage[] = [
  {
    key: 'prepare',
    title: 'Prepare the report',
    owner: 'Submitter',
    summary:
      'Gather the activity record before opening the form. The report is written once, in the order the office reads it.',
    points: [
      'The form moves through the activity details, its classification, the participants, the narrative, and the attachments the office requires.',
      'Each step is checked before the next one opens, so nothing reaches OVPCASSS half-finished.',
      'A draft stays with your account, not on this device; it survives signing out and using another machine.',
    ],
    statuses: ['DRAFT'],
    mail: 'Nothing yet. A draft is private to you until it is submitted.',
    note: 'A draft can be edited or discarded freely. Nothing is issued and no one is notified.',
  },
  {
    key: 'submit',
    title: 'Submit to OVPCASSS',
    owner: 'Submitter',
    summary:
      'Submitting is the moment the report becomes official: the tracking number is issued then, and it never changes.',
    points: [
      'The tracking number carries the report type — OFF for off-campus, EDU for educational tour, INC for in-campus — and the year, such as OFF-2026-0001.',
      'The report becomes read-only while an officer holds it, so the record a reviewer reads cannot shift underneath them.',
      'A returned report reopens for revision. Resubmitting keeps the original tracking number.',
    ],
    statuses: ['SUBMITTED', 'RESUBMITTED'],
    mail: 'A receipt with the tracking number, once mail delivery is configured for the office.',
    note: 'The report and its tracking number are created together, so a submission can never exist without one.',
  },
  {
    key: 'review',
    title: 'Reviewer endorses or returns',
    owner: 'Reviewer',
    summary:
      'The reviewer reads the submission in the Queues screen, then either endorses it onward or sends it back with remarks.',
    points: [
      'Endorsing moves the report to the approving officer; each step is recorded in the append-only history.',
      'Returning reopens the report for the submitter with the reviewer’s remarks attached.',
      'Nobody reviews a report they submitted. The report states this in place of decision controls.',
    ],
    statuses: ['RETURNED_BY_REVIEWER', 'ENDORSED'],
    mail: 'A message when the report is endorsed or returned, naming the next step.',
    note: 'Endorsement is not approval. It passes the report on; the approving officer still decides.',
  },
  {
    key: 'approve',
    title: 'Approver approves or returns',
    owner: 'Approver',
    summary:
      'The approving officer makes the final decision. Approval closes the report and awards it a completion record.',
    points: [
      'Approving is terminal: the report enters the repository and the monitoring workbook, and its acknowledgement becomes available.',
      'Returning sends the report back to the submitter, who revises and resubmits under the same tracking number.',
      'Reports in the repository are readable by reviewers, approvers, and administrators according to their role.',
    ],
    statuses: ['RETURNED_BY_APPROVER', 'APPROVED'],
    mail: 'A message when the report is approved, with the acknowledgement.',
    note: 'Approval is final. A correction after approval needs a new report.',
  },
];

/** The statuses the explainer accounts for, in the order the reader meets them. */
export const EXPLAINED_STATUSES: readonly ReportStatus[] = WORKFLOW_STAGES.flatMap(
  (stage) => stage.statuses,
);
