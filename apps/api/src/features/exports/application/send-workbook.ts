import { createDb, createMonitoringQueries } from '@par/db';
import { semesterLabel, workbookTemplate } from '@par/email';
import { buildMonitoringWorkbook } from '@par/export';
import type { SendWorkbookInput } from '@par/shared';

import { applyAttachmentBudget, maxAttachmentBytes } from '../../../email/attachments';
import { enqueueEmail } from '../../../email/outbox';
import type { Env } from '../../../env';
import { assembleMonitoring } from './assemble-monitoring';

const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export type WorkbookSendResult =
  | { ok: true; queued: number }
  | { ok: false; code: 'TERM_NOT_CONFIGURED'; message: string }
  | { ok: false; code: 'VALIDATION_ERROR'; message: string };

/** Lowercased and de-duplicated; the office address passes by definition. */
function normalize(recipients: readonly string[]): string[] {
  return [...new Set(recipients.map((address) => address.trim().toLowerCase()).filter(Boolean))];
}

/**
 * The term-end workbook hand-off (email spec §11). The file is assembled by the
 * same code as the download, stored once, and mailed as a reference, so the
 * message cannot carry a different workbook from the one the office downloads.
 */
export async function sendMonitoringWorkbook(
  env: Env,
  input: SendWorkbookInput,
  sender: { fullName: string },
  origin?: string,
): Promise<WorkbookSendResult> {
  const recipients = normalize(input.to);
  if (recipients.length === 0) {
    return { ok: false, code: 'VALIDATION_ERROR', message: 'Add at least one recipient.' };
  }

  const assembled = await assembleMonitoring(createMonitoringQueries(createDb(env.DB)), {
    type: input.type,
    schoolYear: input.schoolYear,
    semester: input.semester,
    includeInProgress: input.includeInProgress,
    includeArchived: input.includeArchived,
  });

  if (!assembled.ok) {
    return { ok: false, code: 'TERM_NOT_CONFIGURED', message: assembled.message };
  }

  const bytes = buildMonitoringWorkbook({
    type: input.type,
    schoolYear: input.schoolYear,
    semester: input.semester,
    rows: assembled.sheet.rows,
  });

  const objectKey = `exports/${crypto.randomUUID()}.xlsx`;
  await env.BUCKET.put(objectKey, bytes, { httpMetadata: { contentType: XLSX_TYPE } });

  const budget = applyAttachmentBudget(
    [
      {
        objectKey,
        filename: `OVPCASSS-Monitoring-${input.type.replaceAll('_', '-')}-SY${input.schoolYear}-S${input.semester}.xlsx`,
        contentType: XLSX_TYPE,
        size: bytes.length,
      },
    ],
    maxAttachmentBytes(env),
  );

  const term = semesterLabel(input.semester);
  const content = workbookTemplate({
    type: input.type,
    schoolYear: input.schoolYear,
    semester: input.semester,
    term,
    reportCount: assembled.sheet.sheet.total,
    generatedAt: new Date().toISOString(),
    generatedBy: sender.fullName,
    ...(input.note ? { note: input.note } : {}),
    ...(origin === undefined ? {} : { origin }),
    hasAttachment: budget.refs.length > 0,
    attachmentOmitted: budget.omitted,
  });

  for (const to of recipients) {
    await enqueueEmail(env, {
      kind: 'WORKBOOK',
      to,
      content,
      attachments: budget.refs,
      ...(budget.omitted ? { note: 'attachment omitted (size)' } : {}),
    });
  }

  return { ok: true, queued: recipients.length };
}
