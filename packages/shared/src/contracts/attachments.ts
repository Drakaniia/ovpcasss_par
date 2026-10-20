import { z } from 'zod';

import { ATTACHMENT_STATUSES } from '../domain/enums';
import { idSchema, isoDateTimeSchema } from './common';

export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

export const presignRequestSchema = z.object({
  fileName: z.string().min(1).max(255),
  size: z.number().int().positive().max(MAX_ATTACHMENT_BYTES),
  mimeType: z.string().min(1).max(127),
});
export type PresignRequest = z.infer<typeof presignRequestSchema>;

export const attachmentStatusSchema = z.enum(ATTACHMENT_STATUSES);

/** The server's record of an uploaded file; the label drives the completeness checklist. */
export const attachmentSchema = z.object({
  id: idSchema,
  reportId: idSchema,
  label: z.string(),
  originalName: z.string(),
  size: z.number().int().min(0),
  mimeType: z.string(),
  status: attachmentStatusSchema,
  createdAt: isoDateTimeSchema.optional(),
});
export type Attachment = z.infer<typeof attachmentSchema>;

/**
 * Where to send the bytes. `presigned` is a direct R2 PUT (spec §7.8); `proxy`
 * is the API itself, used when object-storage signing is not configured (local
 * `wrangler dev`), where the file takes the same route but through the Worker.
 */
export const PRESIGN_MODES = ['presigned', 'proxy'] as const;
export type PresignMode = (typeof PRESIGN_MODES)[number];

/** Presigned direct-to-R2 upload; the client PUTs the file to `uploadUrl`. */
export const presignResponseSchema = z.object({
  attachmentId: idSchema,
  uploadUrl: z.string().min(1),
  method: z.string().default('PUT'),
  mode: z.enum(PRESIGN_MODES).default('presigned'),
  headers: z.record(z.string(), z.string()).optional(),
});
export type PresignResponse = z.infer<typeof presignResponseSchema>;

/** The label is chosen in the uploader and recorded when the upload is confirmed. */
export const confirmAttachmentInputSchema = z.object({
  label: z.string().max(120).optional(),
});
export type ConfirmAttachmentInput = z.infer<typeof confirmAttachmentInputSchema>;

export const confirmAttachmentResponseSchema = z.object({ attachment: attachmentSchema });
export type ConfirmAttachmentResponse = z.infer<typeof confirmAttachmentResponseSchema>;

/** Short-lived signed URL; PDFs and images open in a new tab, office files download. */
export const attachmentUrlResponseSchema = z.object({
  url: z.string().min(1),
  expiresAt: isoDateTimeSchema.optional(),
});
export type AttachmentUrlResponse = z.infer<typeof attachmentUrlResponseSchema>;
