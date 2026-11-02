import {
  EMAIL_TEMPLATE_SLOTS,
  EMAIL_TEMPLATE_TOKENS,
  EMAIL_TOKEN_LABELS,
  type EmailKind,
  type EmailTemplateCopy,
  type EmailTokenOption,
} from '@par/shared';

import type { EmailContent } from './provider';
import type { EmailTemplateContext } from './resolve';
import {
  SAMPLE_COMMENTS,
  SAMPLE_ORIGIN,
  sampleAccount,
  sampleDigest,
  sampleNarrative,
  sampleWorkbook,
} from './sample-data';
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
} from './templates/narrative-events';
import { failureDigestTemplate, workbookTemplate } from './templates/operations';
import { accountContext, digestContext, narrativeContext, workbookContext } from './context';

export { SAMPLE_ORIGIN } from './sample-data';

export interface EmailSample {
  kind: EmailKind;
  audience: string;
  content: EmailContent;
}

/** One rendered example per kind, used by the dev preview and the snapshot tests. */
export function emailSamples(): EmailSample[] {
  const rows: { kind: EmailKind; content: EmailContent }[] = [
    { kind: 'ASSIGNED', content: assignedTemplate(sampleNarrative()) },
    { kind: 'SUBMITTED', content: submittedTemplate(sampleNarrative()) },
    {
      kind: 'RETURNED',
      content: returnedTemplate({ ...sampleNarrative(), comments: SAMPLE_COMMENTS }),
    },
    { kind: 'APPROVED', content: approvedTemplate(sampleNarrative()) },
    { kind: 'RECEIPT_ISSUED', content: receiptIssuedTemplate(sampleNarrative()) },
    {
      kind: 'RECORD_EDITED',
      content: recordEditedTemplate({ ...sampleNarrative(), ...recordCorrection() }),
    },
    { kind: 'REMINDER', content: reminderTemplate(sampleNarrative()) },
    { kind: 'WORKBOOK', content: workbookTemplate(sampleWorkbook()) },
    { kind: 'FAILURE_DIGEST', content: failureDigestTemplate(sampleDigest()) },
    ...accountSamples(),
    { kind: 'PIC_REMOVED', content: picRemovedTemplate(sampleNarrative()) },
  ];

  return rows.map((sample) => ({
    ...sample,
    audience: EMAIL_TEMPLATE_SLOTS[sample.kind].audience,
  }));
}

function recordCorrection() {
  return {
    changedFields: ['Activity title', 'Location'],
    reason: 'The location was entered as the venue office instead of the activity site.',
  };
}

function accountSamples(): { kind: EmailKind; content: EmailContent }[] {
  const origin = SAMPLE_ORIGIN;
  return [
    {
      kind: 'VERIFY',
      content: verifyEmailTemplate(
        sampleAccount(`${origin}/verify-email?token=sample`, origin),
      ),
    },
    {
      kind: 'RESET',
      content: resetPasswordTemplate(
        sampleAccount(`${origin}/reset-password?token=sample`, origin),
      ),
    },
    {
      kind: 'ROLE_ASSIGNED',
      content: roleAssignedTemplate(sampleAccount(`${origin}/login`, origin)),
    },
    {
      kind: 'ACCOUNT_ACTIVATED',
      content: accountActivatedTemplate(sampleAccount(`${origin}/login`, origin)),
    },
    {
      kind: 'ACCOUNT_DISABLED',
      content: accountDisabledTemplate(sampleAccount(`${origin}/login`, origin)),
    },
  ];
}

export function sampleFor(kind: EmailKind): EmailSample | null {
  return emailSamples().find((sample) => sample.kind === kind) ?? null;
}

/** Where each account kind's button points in the sample dataset. */
function accountSampleUrl(kind: EmailKind): string {
  if (kind === 'VERIFY') return `${SAMPLE_ORIGIN}/verify-email?token=sample`;
  if (kind === 'RESET') return `${SAMPLE_ORIGIN}/reset-password?token=sample`;
  return `${SAMPLE_ORIGIN}/login`;
}

/**
 * The context a kind's sample data resolves against. Shared by the preview and
 * the token menu, so an example is always the value the sample would send.
 */
export function sampleContextFor(
  kind: EmailKind,
  origin: string = SAMPLE_ORIGIN,
): EmailTemplateContext {
  switch (kind) {
    case 'ASSIGNED':
    case 'SUBMITTED':
    case 'RETURNED':
    case 'APPROVED':
    case 'RECEIPT_ISSUED':
    case 'RECORD_EDITED':
    case 'REMINDER':
    case 'PIC_REMOVED':
      return narrativeContext({
        ...sampleNarrative(origin),
        ...(kind === 'RETURNED' ? { comments: SAMPLE_COMMENTS } : {}),
        ...(kind === 'RECORD_EDITED' ? recordCorrection() : {}),
      });
    case 'WORKBOOK':
      return workbookContext(sampleWorkbook(origin));
    case 'FAILURE_DIGEST':
      return digestContext(sampleDigest(origin));
    case 'VERIFY':
      return accountContext(sampleAccount(accountSampleUrl(kind), origin), 'verifyUrl');
    case 'RESET':
      return accountContext(sampleAccount(accountSampleUrl(kind), origin), 'resetUrl');
    case 'ROLE_ASSIGNED':
    case 'ACCOUNT_ACTIVATED':
    case 'ACCOUNT_DISABLED':
      return accountContext(sampleAccount(accountSampleUrl(kind), origin), 'loginUrl');
  }
}

/** The sample message rendered with the submitted copy, for the admin preview. */
export function previewEmail(
  kind: EmailKind,
  copy: EmailTemplateCopy,
  origin: string = SAMPLE_ORIGIN,
): EmailContent {
  const data = sampleNarrative(origin);
  const account = () => sampleAccount(accountSampleUrl(kind), origin);

  switch (kind) {
    case 'ASSIGNED':
      return assignedTemplate(data, copy);
    case 'SUBMITTED':
      return submittedTemplate(data, copy);
    case 'RETURNED':
      return returnedTemplate({ ...data, comments: SAMPLE_COMMENTS }, copy);
    case 'APPROVED':
      return approvedTemplate(data, copy);
    case 'RECEIPT_ISSUED':
      return receiptIssuedTemplate(data, copy);
    case 'RECORD_EDITED':
      return recordEditedTemplate({ ...data, ...recordCorrection() }, copy);
    case 'REMINDER':
      return reminderTemplate(data, copy);
    case 'PIC_REMOVED':
      return picRemovedTemplate(data, copy);
    case 'WORKBOOK':
      return workbookTemplate(sampleWorkbook(origin), copy);
    case 'FAILURE_DIGEST':
      return failureDigestTemplate(sampleDigest(origin), copy);
    case 'VERIFY':
      return verifyEmailTemplate(account(), copy);
    case 'RESET':
      return resetPasswordTemplate(account(), copy);
    case 'ROLE_ASSIGNED':
      return roleAssignedTemplate(account(), copy);
    case 'ACCOUNT_ACTIVATED':
      return accountActivatedTemplate(account(), copy);
    case 'ACCOUNT_DISABLED':
      return accountDisabledTemplate(account(), copy);
  }
}

/**
 * The token menu for one kind: only values that kind actually sends, each with
 * the sample's own text so a token is recognisable before it is inserted.
 */
export function tokenOptionsFor(kind: EmailKind): EmailTokenOption[] {
  const context = sampleContextFor(kind);

  return EMAIL_TEMPLATE_TOKENS[kind].map((token) => ({
    token,
    label: EMAIL_TOKEN_LABELS[token],
    example: context.values[token] ?? '',
  }));
}
