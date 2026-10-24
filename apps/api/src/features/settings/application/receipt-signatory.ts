import { createDb, createSettingsQueries } from '@par/db';
import {
  DEFAULT_RECEIPT_SIGNATORY,
  receiptSignatorySchema,
  type ReceiptSignatory,
} from '@par/shared';

import type { Env } from '../../../env';

/**
 * The receipt's closing block (report 9). A stored administrator setting wins;
 * the Worker variable is the deployment-level fallback it replaced; the office
 * default is last so a half-configured environment still prints a signature.
 */
export function resolveReceiptSignatory(
  stored: unknown,
  envValues: { name?: string; title?: string },
): ReceiptSignatory {
  const parsed = receiptSignatorySchema.safeParse(stored);
  if (parsed.success) return parsed.data;

  return {
    name: envValues.name?.trim() || DEFAULT_RECEIPT_SIGNATORY.name,
    title: envValues.title?.trim() || DEFAULT_RECEIPT_SIGNATORY.title,
  };
}

export async function receiptSignatoryFor(env: Env): Promise<ReceiptSignatory> {
  const stored = await createSettingsQueries(createDb(env.DB)).get<ReceiptSignatory>(
    'receipt-signatory',
  );

  return resolveReceiptSignatory(stored, {
    ...(env.RECEIPT_SIGNATORY_NAME ? { name: env.RECEIPT_SIGNATORY_NAME } : {}),
    ...(env.RECEIPT_SIGNATORY_TITLE ? { title: env.RECEIPT_SIGNATORY_TITLE } : {}),
  });
}
