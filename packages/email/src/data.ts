/**
 * The data each mail family is built from (email spec §5). Templates keep these
 * shapes so every caller is unchanged; the copy layer reads them through the
 * context builders in `context.ts`.
 */

export interface AccountEventData {
  fullName: string;
  /** Absolute link, built by the API from the request origin. */
  actionUrl?: string;
  roleLabel?: string;
  roleDescription?: string;
  officeEmail?: string;
  /** Absolute app origin, for the header logo. */
  origin?: string | undefined;
}

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

export interface WorkbookMailData {
  type: string;
  schoolYear: string;
  semester: number;
  term: string;
  reportCount: number;
  generatedAt: string;
  generatedBy: string;
  note?: string;
  origin?: string;
  hasAttachment?: boolean;
  attachmentOmitted?: boolean;
}

export interface FailureDigestFailure {
  kind: string;
  to: string;
  error: string;
}

export interface FailureDigestData {
  count: number;
  failures: readonly FailureDigestFailure[];
  origin?: string;
}
