import type { EmailKind, EmailTemplateCopy } from '@par/shared';

import { accountContext } from '../context';
import { defaultCopyFor } from '../copy';
import type { AccountEventData } from '../data';
import type { EmailContent } from '../provider';
import { resolveEmailTemplate } from '../resolve';
import { renderShell } from '../shell';

export type { AccountEventData } from '../data';

/**
 * Account and security mail (email spec §5.2). These kinds have no mute switch:
 * a person cannot opt out of being told their password was reset or that their
 * account was disabled. The words are the office's; the kind's structure,
 * signature block, and link are not.
 */
function content(
  kind: EmailKind,
  data: AccountEventData,
  urlToken: 'verifyUrl' | 'resetUrl' | 'loginUrl',
  copy: EmailTemplateCopy | undefined,
): EmailContent {
  return renderShell(
    resolveEmailTemplate(copy ?? defaultCopyFor(kind), accountContext(data, urlToken)),
  );
}

export function verifyEmailTemplate(
  data: AccountEventData,
  copy?: EmailTemplateCopy,
): EmailContent {
  return content('VERIFY', data, 'verifyUrl', copy);
}

export function resetPasswordTemplate(
  data: AccountEventData,
  copy?: EmailTemplateCopy,
): EmailContent {
  return content('RESET', data, 'resetUrl', copy);
}

export function roleAssignedTemplate(
  data: AccountEventData,
  copy?: EmailTemplateCopy,
): EmailContent {
  return content('ROLE_ASSIGNED', data, 'loginUrl', copy);
}

export function accountActivatedTemplate(
  data: AccountEventData,
  copy?: EmailTemplateCopy,
): EmailContent {
  return content('ACCOUNT_ACTIVATED', data, 'loginUrl', copy);
}

export function accountDisabledTemplate(
  data: AccountEventData,
  copy?: EmailTemplateCopy,
): EmailContent {
  return content('ACCOUNT_DISABLED', data, 'loginUrl', copy);
}
