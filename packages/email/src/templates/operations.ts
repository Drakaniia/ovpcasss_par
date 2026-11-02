import type { EmailKind, EmailTemplateCopy } from '@par/shared';

import { digestContext, workbookContext } from '../context';
import { defaultCopyFor } from '../copy';
import type { FailureDigestData, WorkbookMailData } from '../data';
import type { EmailContent } from '../provider';
import { resolveEmailTemplate } from '../resolve';
import { renderShell } from '../shell';

export type { FailureDigestData, FailureDigestFailure, WorkbookMailData } from '../data';

function content(
  kind: EmailKind,
  copy: EmailTemplateCopy | undefined,
  build: () => Parameters<typeof resolveEmailTemplate>[1],
): EmailContent {
  return renderShell(resolveEmailTemplate(copy ?? defaultCopyFor(kind), build()));
}

export function workbookTemplate(
  data: WorkbookMailData,
  copy?: EmailTemplateCopy,
): EmailContent {
  return content('WORKBOOK', copy, () => workbookContext(data));
}

export function failureDigestTemplate(
  data: FailureDigestData,
  copy?: EmailTemplateCopy,
): EmailContent {
  return content('FAILURE_DIGEST', copy, () => digestContext(data));
}
