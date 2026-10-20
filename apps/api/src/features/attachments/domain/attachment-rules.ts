import { MAX_ATTACHMENT_BYTES } from '@par/shared';

/**
 * Upload allowlist (spec §7.8). Executables, scripts, and anything the office
 * cannot open are refused before a presigned URL is ever minted. The extension
 * and the declared type must both be known; `application/octet-stream` is
 * accepted only because some office clients send it for a known extension.
 */
const ALLOWED_EXTENSIONS = new Set([
  'pdf',
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'txt',
  'csv',
  'zip',
]);

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/x-zip-compressed',
  'application/octet-stream',
]);

export function extensionOf(fileName: string): string {
  const index = fileName.lastIndexOf('.');
  return index === -1 ? '' : fileName.slice(index + 1).toLowerCase();
}

export function isAllowedAttachment(fileName: string, mimeType: string): boolean {
  return (
    ALLOWED_EXTENSIONS.has(extensionOf(fileName)) && ALLOWED_MIME_TYPES.has(mimeType.toLowerCase())
  );
}

/**
 * What storage actually holds, checked at confirm (spec §7.8). The presigned PUT
 * carries the client's own content type, so the declared value is only a claim:
 * an executable renamed to `.pdf` would otherwise reach the office. A generic
 * type is accepted because office clients and some browsers omit the real one;
 * the extension was already checked at presign.
 */
export function storedTypeAllowed(contentType: string | undefined): boolean {
  if (!contentType) return true;

  const normalized = contentType.split(';')[0]?.trim().toLowerCase() ?? '';
  if (normalized === '' || normalized === 'application/octet-stream') return true;

  return ALLOWED_MIME_TYPES.has(normalized);
}

export function attachmentSizeProblem(size: number): string | null {
  if (size <= 0) return 'The file is empty.';
  if (size > MAX_ATTACHMENT_BYTES) {
    return `The file is larger than ${MAX_ATTACHMENT_BYTES / (1024 * 1024)} MB.`;
  }
  return null;
}
