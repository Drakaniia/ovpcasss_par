import type { ReportStatus } from '@par/shared';

/**
 * The workflow explainer (UI spec §4.2). Three readable stages, each anchored to
 * the API statuses it covers — the four statuses in `REPORT_STATUSES` appear
 * here exactly once, so the screen can never invent a state the machine does
 * not have. A test holds that invariant.
 */

export type WorkflowStageKey = 'prepare' | 'narrative' | 'decision';

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
    title: 'The office registers the activity',
    owner: 'Administrator',
    summary:
      'OVPCASSS records the activity and assigns the personnel in charge before anyone writes a word.',
    points: [
      'The administrator captures the activity type, classification, campus, title, dates, location, number of activities, and the people in charge.',
      'Saving issues the AR No. — a global sequence starting at 0001 that never resets or repeats.',
      'Each person in charge is emailed the reference, and an account is created or linked for them.',
    ],
    statuses: ['PENDING'],
    mail: 'A message to each person in charge, led by the AR No., naming the activity.',
    note: 'The record exists from the moment it is saved; its status is Pending until a narrative is submitted.',
  },
  {
    key: 'narrative',
    title: 'Personnel in charge write the narrative',
    owner: 'Personnel in charge',
    summary:
      'Each named person opens the record by AR No. from Home, writes the narrative, and submits it.',
    points: [
      'Home lists the records that name the account, by AR No. and activity facts; the account cannot create, edit, or delete a record.',
      'The narrative is typed against the record, with the attachments the office requires and an optional signature.',
      'A draft stays with the account until it is submitted. Submitting notifies the office that the narrative is ready.',
    ],
    statuses: ['SUBMITTED'],
    mail: 'A notice to the office when a narrative is submitted.',
    note: 'One narrative per person in charge; the record itself was settled by the office.',
  },
  {
    key: 'decision',
    title: 'The office checks the narrative',
    owner: 'Administrator',
    summary:
      'The only decision is on the submitted narrative: approve it, or return it with comments.',
    points: [
      'Approving closes the record and issues one OVPCASSS-F-013 acknowledgment receipt per person in charge.',
      'Returning reopens the narrative for revision with the administrator’s comments attached.',
      'Approved records enter the repository and the monitoring workbook.',
    ],
    statuses: ['RETURNED', 'APPROVED'],
    mail: 'A message when the narrative is approved, with the acknowledgment receipt attached.',
    note: 'Approval is final. A correction after approval needs a new record.',
  },
];

/** The statuses the explainer accounts for, in the order the reader meets them. */
export const EXPLAINED_STATUSES: readonly ReportStatus[] = WORKFLOW_STAGES.flatMap(
  (stage) => stage.statuses,
);
