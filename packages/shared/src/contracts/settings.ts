import { z } from 'zod';

/**
 * The office's receipt signatory (report 9). The name and position print in the
 * closing block of every new OVPCASSS-F-013. Once a receipt PDF has been
 * rendered it is never rewritten, so a change here reaches only receipts issued
 * after it.
 */
export const DEFAULT_RECEIPT_SIGNATORY = {
  name: 'DR. LINCOLN V. TAN',
  title: 'VPCASSS',
} as const;

export const receiptSignatorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Enter the name that signs the receipt.')
    .max(80, 'Keep the name under 80 characters.'),
  title: z
    .string()
    .trim()
    .min(1, 'Enter the position under the name.')
    .max(80, 'Keep the position under 80 characters.'),
});
export type ReceiptSignatory = z.infer<typeof receiptSignatorySchema>;

export const receiptSignatoryResponseSchema = z.object({ signatory: receiptSignatorySchema });
export type ReceiptSignatoryResponse = z.infer<typeof receiptSignatoryResponseSchema>;
