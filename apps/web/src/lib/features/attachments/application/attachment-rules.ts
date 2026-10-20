import { MAX_ATTACHMENT_BYTES } from '@par/shared';

/**
 * Uploader rules (UI spec §8.5). The server allowlist is authoritative; this
 * pre-check mirrors the documented categories so a rejection names the file and
 * the limit before a pointless upload starts.
 */

export type AttachmentUiStatus = 'UPLOADING' | 'PENDING' | 'CONFIRMED' | 'FAILED';

export type FileLike = { name: string; size: number; type?: string };

export type FileRejection = { name: string; message: string };

export type AttachmentKind =
  'pdf' | 'image' | 'word' | 'excel' | 'powerpoint' | 'archive' | 'text' | 'other';

const ALLOWED_EXTENSIONS = new Set([
  'pdf',
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'heic',
  'bmp',
  'tif',
  'tiff',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'txt',
  'csv',
  'zip',
  'rar',
  '7z',
]);

const KIND_BY_EXTENSION: Record<string, AttachmentKind> = {
  pdf: 'pdf',
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  gif: 'image',
  webp: 'image',
  heic: 'image',
  bmp: 'image',
  tif: 'image',
  tiff: 'image',
  doc: 'word',
  docx: 'word',
  xls: 'excel',
  xlsx: 'excel',
  ppt: 'powerpoint',
  pptx: 'powerpoint',
  zip: 'archive',
  rar: 'archive',
  '7z': 'archive',
  txt: 'text',
  csv: 'text',
};

/** The `accept` attribute; keeps the picker focused without hiding the reason. */
export const ACCEPT_ATTRIBUTE = [...ALLOWED_EXTENSIONS]
  .map((extension) => `.${extension}`)
  .join(',');

export const MAX_FILE_SIZE_LABEL = formatFileSize(MAX_ATTACHMENT_BYTES);

export function extensionOf(name: string): string {
  const index = name.lastIndexOf('.');
  return index === -1 ? '' : name.slice(index + 1).toLowerCase();
}

export function fileKind(name: string): AttachmentKind {
  return KIND_BY_EXTENSION[extensionOf(name)] ?? 'other';
}

export function isPreviewable(name: string): boolean {
  const kind = fileKind(name);
  return kind === 'pdf' || kind === 'image';
}

export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    const megabytes = bytes / (1024 * 1024);
    return `${Number.isInteger(megabytes) ? megabytes : megabytes.toFixed(1)} MB`;
  }
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

/** Null means the file may proceed; a string is the message shown to the author. */
export function fileError(file: FileLike): string | null {
  if (file.size === 0) return `${file.name} is empty.`;

  if (file.size > MAX_ATTACHMENT_BYTES) {
    return `${file.name} is ${formatFileSize(file.size)}; the limit is ${MAX_FILE_SIZE_LABEL}.`;
  }

  if (!ALLOWED_EXTENSIONS.has(extensionOf(file.name))) {
    return `${file.name} is not an accepted file type.`;
  }

  return null;
}

export function validateFiles<T extends FileLike>(
  files: readonly T[],
): { accepted: T[]; rejected: FileRejection[] } {
  const accepted: T[] = [];
  const rejected: FileRejection[] = [];

  for (const file of files) {
    const message = fileError(file);
    if (message) rejected.push({ name: file.name, message });
    else accepted.push(file);
  }

  return { accepted, rejected };
}

const STATUS_LABELS: Record<AttachmentUiStatus, string> = {
  UPLOADING: 'Uploading',
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  FAILED: 'Failed',
};

const STATUS_TONES: Record<AttachmentUiStatus, 'info' | 'gold' | 'success' | 'danger'> = {
  UPLOADING: 'info',
  PENDING: 'gold',
  CONFIRMED: 'success',
  FAILED: 'danger',
};

export function statusLabel(status: AttachmentUiStatus): string {
  return STATUS_LABELS[status];
}

export function statusTone(status: AttachmentUiStatus): 'info' | 'gold' | 'success' | 'danger' {
  return STATUS_TONES[status];
}

export function isOnServer(status: AttachmentUiStatus): boolean {
  return status === 'PENDING' || status === 'CONFIRMED';
}
