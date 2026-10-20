import type { PresignResponse } from '@par/shared';

import { sessionAuthHeaders } from '$lib/api/http';

/**
 * The upload PUT (spec §7.8). Usually the URL is presigned and the file goes
 * straight to R2; when signing is not configured the API is the target instead
 * (`mode: "proxy"`). XHR is used only because `fetch` cannot report progress.
 */

/**
 * The PUT's headers. A presigned URL authenticates by its signature; the API
 * proxy answers to the session, and the desktop shell carries a token rather
 * than a cookie, so the token has to travel with the bytes.
 */
export function uploadHeaders(presign: PresignResponse): Record<string, string> {
  return presign.mode === 'proxy'
    ? { ...presign.headers, ...sessionAuthHeaders() }
    : (presign.headers ?? {});
}

export type UploadRequest = {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  file: File;
  /** Set when the API itself is the target, so the session cookie travels. */
  withCredentials?: boolean;
  onprogress?: (percent: number) => void;
  onstart?: (cancel: () => void) => void;
};

export function uploadToPresignedUrl(request: UploadRequest): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(request.method ?? 'PUT', request.url);
    if (request.withCredentials) xhr.withCredentials = true;

    for (const [key, value] of Object.entries(request.headers ?? {})) {
      xhr.setRequestHeader(key, value);
    }

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      request.onprogress?.(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        request.onprogress?.(100);
        resolve();
      } else {
        reject(new Error(`The upload failed with status ${xhr.status}.`));
      }
    };
    xhr.onerror = () =>
      reject(new Error('The upload did not complete. Check your connection and try again.'));
    xhr.onabort = () => reject(new Error('The upload was cancelled.'));

    request.onstart?.(() => xhr.abort());
    xhr.send(request.file);
  });
}
