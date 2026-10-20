import type { Attachment } from '@par/shared';

import type { AttachmentUiStatus } from './attachment-rules';

/**
 * One row in the uploader. The client status is richer than the server enum
 * (spec §8.5): Uploading and Failed exist only while an upload is in flight.
 */
export type AttachmentItem = {
  /** Stable row key; survives retry even when the server id changes. */
  key: string;
  /** Server id once presign has succeeded; null while local. */
  id: string | null;
  fileName: string;
  size: number;
  mimeType: string;
  label: string;
  status: AttachmentUiStatus;
  /** 0–100 while uploading. */
  progress: number;
  error?: string;
  /** Retained so a failed upload can be retried without re-picking the file. */
  file?: File;
  /** Desktop source path; the file streams from disk instead of a `File` blob. */
  path?: string;
};

/** A row key that survives retry, even when the server id changes. */
export function newAttachmentKey(): string {
  const cryptoRef = globalThis.crypto as Crypto | undefined;
  if (cryptoRef && typeof cryptoRef.randomUUID === 'function') return cryptoRef.randomUUID();
  return `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * The API message when there is one, so a rejection names its own reason. Tauri
 * rejects with a plain string, which must not be flattened into the fallback.
 */
export function uploadErrorText(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.trim()) return error.trim();
  return fallback;
}

export function itemFromAttachment(attachment: Attachment, file?: File): AttachmentItem {
  return {
    key: attachment.id,
    id: attachment.id,
    fileName: attachment.originalName,
    size: attachment.size,
    mimeType: attachment.mimeType,
    label: attachment.label,
    status: attachment.status === 'CONFIRMED' ? 'CONFIRMED' : 'PENDING',
    progress: 100,
    ...(file ? { file } : {}),
  };
}
