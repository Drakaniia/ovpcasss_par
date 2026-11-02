import type { EmailKind, EmailTemplateCopy } from '@par/shared';

import { ACCOUNT_COPY } from './copy-account';
import { NARRATIVE_COPY } from './copy-narrative';
import { OPERATIONS_COPY } from './copy-operations';

/**
 * The built-in copy for every outbound kind (email message editor spec §4.1).
 * Absent a saved override, these are the words a recipient reads — and they are
 * the same words the templates hand-wrote before copy became data, which the
 * snapshot tests hold.
 */
export const EMAIL_TEMPLATE_DEFAULTS: Record<EmailKind, EmailTemplateCopy> = {
  ASSIGNED: NARRATIVE_COPY.ASSIGNED,
  SUBMITTED: NARRATIVE_COPY.SUBMITTED,
  RETURNED: NARRATIVE_COPY.RETURNED,
  APPROVED: NARRATIVE_COPY.APPROVED,
  RECEIPT_ISSUED: NARRATIVE_COPY.RECEIPT_ISSUED,
  RECORD_EDITED: NARRATIVE_COPY.RECORD_EDITED,
  REMINDER: NARRATIVE_COPY.REMINDER,
  PIC_REMOVED: NARRATIVE_COPY.PIC_REMOVED,
  WORKBOOK: OPERATIONS_COPY.WORKBOOK,
  FAILURE_DIGEST: OPERATIONS_COPY.FAILURE_DIGEST,
  VERIFY: ACCOUNT_COPY.VERIFY,
  RESET: ACCOUNT_COPY.RESET,
  ROLE_ASSIGNED: ACCOUNT_COPY.ROLE_ASSIGNED,
  ACCOUNT_ACTIVATED: ACCOUNT_COPY.ACCOUNT_ACTIVATED,
  ACCOUNT_DISABLED: ACCOUNT_COPY.ACCOUNT_DISABLED,
};

/** A fresh copy, so a caller can hand it to the editor without sharing state. */
export function defaultCopyFor(kind: EmailKind): EmailTemplateCopy {
  return structuredClone(EMAIL_TEMPLATE_DEFAULTS[kind]);
}
