import { z } from 'zod';

/**
 * Reviewer and approver decisions (project spec §7.3, UI spec §7.10). The three
 * actions are the only writes the decision drawer can make; the server owns the
 * resulting status, so no input carries a target status.
 */
export const DECISION_ACTIONS = ['ENDORSE', 'APPROVE', 'RETURN'] as const;
export type DecisionAction = (typeof DECISION_ACTIONS)[number];

export const DECISION_COMMENT_MAX = 4000;

/** Endorse and approve both accept one optional note; the note is never required. */
export const decisionNoteSchema = z.object({
  note: z
    .string()
    .trim()
    .max(DECISION_COMMENT_MAX, `Use ${DECISION_COMMENT_MAX} characters or fewer.`)
    .optional(),
});
export type DecisionNoteInput = z.infer<typeof decisionNoteSchema>;

/**
 * A return carries the reason the report was sent back. The reviewer's copy goes
 * to the same shape as the approver's; the server derives the return status from
 * the caller's role and the report's current status.
 */
export const returnReportSchema = z.object({
  comments: z
    .string()
    .trim()
    .min(1, 'Enter a comment before returning the report.')
    .max(DECISION_COMMENT_MAX, `Use ${DECISION_COMMENT_MAX} characters or fewer.`),
  /** Checked by default: the submitter is told by email as well as in the system. */
  notifySubmitter: z.boolean().default(true),
});
export type ReturnReportInput = z.infer<typeof returnReportSchema>;
