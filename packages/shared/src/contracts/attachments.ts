import { z } from 'zod';

import { ATTACHMENT_STATUSES } from '../domain/enums';

export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

export const presignRequestSchema = z.object({
  fileName: z.string().min(1).max(255),
  size: z.number().int().positive().max(MAX_ATTACHMENT_BYTES),
  mimeType: z.string().min(1).max(127),
});
export type PresignRequest = z.infer<typeof presignRequestSchema>;

export const attachmentStatusSchema = z.enum(ATTACHMENT_STATUSES);
