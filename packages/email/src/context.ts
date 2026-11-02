import type { EmailToken } from '@par/shared';

import type {
  AccountEventData,
  FailureDigestData,
  NarrativeEventData,
  WorkbookMailData,
} from './data';
import { manilaDate, manilaDateTime, sheetLabel } from './format';
import { DEFAULT_OFFICE_EMAIL, logoUrl } from './identity';
import type { EmailTemplateContext } from './resolve';

/** `path` appended to the app origin, or empty when the origin is unknown. */
function url(origin: string | undefined, path: string): string {
  return origin ? `${origin}${path}` : '';
}

/**
 * The values and cases behind each mail family (email message editor spec §4.3).
 * One builder per data shape, so a template never formats a value itself.
 */
export function narrativeContext(data: NarrativeEventData): EmailTemplateContext {
  const waitingDays = data.waitingDays;
  const hasWaitingDays = waitingDays !== undefined && waitingDays > 0;

  return {
    values: {
      referenceNo: data.referenceNo,
      title: data.title,
      activityDate: manilaDate(data.activityDate),
      location: data.location ?? '',
      picName: data.picName ?? '',
      submitterName: data.submitterName ?? '',
      submitterNameFallback: data.submitterName ?? 'The personnel in charge',
      comments: data.comments ?? '',
      // The review mail has always shown the timestamp it was handed under
      // "Submitted"; the token keeps that behaviour rather than re-deriving it.
      approvedDate: manilaDate(data.approvedAt),
      submittedAt: manilaDateTime(data.approvedAt),
      waitingDays: hasWaitingDays ? String(waitingDays) : '',
      changedFields: data.changedFields?.join(', ') ?? '',
      reason: data.reason ?? '',
      dashboardUrl: url(data.origin, '/'),
      reportsQueueUrl: url(data.origin, '/reports?tab=submitted'),
      registerUrl: url(data.origin, '/register'),
    },
    conditions: {
      newAccount: data.newAccount === true,
      existingAccount: data.newAccount !== true,
      attached: data.hasAttachment === true,
      omitted: data.hasAttachment !== true && data.attachmentOmitted === true,
      none: data.hasAttachment !== true && data.attachmentOmitted !== true,
      withWaitingDays: hasWaitingDays,
      withoutWaitingDays: !hasWaitingDays,
    },
    logoUrl: logoUrl(data.origin),
  };
}

/**
 * Account mail passes one absolute link; each kind names it with its own URL
 * token (`verifyUrl`, `resetUrl`, `loginUrl`) so a token menu can never offer a
 * link the message does not carry.
 */
export function accountContext(
  data: AccountEventData,
  urlToken: Extract<EmailToken, 'verifyUrl' | 'resetUrl' | 'loginUrl'>,
): EmailTemplateContext {
  const actionUrl = data.actionUrl ?? '';

  return {
    values: {
      fullName: data.fullName,
      roleLabel: data.roleLabel ?? 'a role',
      roleDescription:
        data.roleDescription ?? 'The role decides which reports and queues your account can reach.',
      officeEmail: data.officeEmail ?? DEFAULT_OFFICE_EMAIL,
      [urlToken]: actionUrl,
    },
    conditions: {},
    logoUrl: logoUrl(data.origin),
  };
}

export function workbookContext(data: WorkbookMailData): EmailTemplateContext {
  const sheet = sheetLabel(data.type);
  const termAndYear = `${data.term}, SY ${data.schoolYear}`;

  return {
    values: {
      sheet,
      schoolYear: data.schoolYear,
      term: data.term,
      termAndYear,
      reportCount: String(data.reportCount),
      generatedAt: manilaDateTime(data.generatedAt),
      generatedBy: data.generatedBy,
      note: data.note ?? '',
    },
    conditions: {
      hasNote: Boolean(data.note),
      attachmentOmitted: data.hasAttachment !== true && data.attachmentOmitted === true,
    },
    logoUrl: logoUrl(data.origin),
  };
}

export function digestContext(data: FailureDigestData): EmailTemplateContext {
  const noun = data.count === 1 ? 'message' : 'messages';

  return {
    values: {
      count: String(data.count),
      messageNoun: noun,
      emailLogUrl: url(data.origin, '/admin/emails'),
    },
    conditions: {},
    facts: data.failures.map((failure) => ({
      label: failure.kind,
      value: `${failure.to} — ${failure.error}`,
    })),
    logoUrl: logoUrl(data.origin),
  };
}
