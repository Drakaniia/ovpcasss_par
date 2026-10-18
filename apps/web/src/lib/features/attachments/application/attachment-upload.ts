/**
 * Direct-to-R2 upload (spec §7.8). The API returns a presigned URL; the file is
 * PUT there so it never passes through the Worker. XHR is used only because
 * `fetch` cannot report upload progress.
 */

export type UploadRequest = {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  file: File;
  onprogress?: (percent: number) => void;
  onstart?: (cancel: () => void) => void;
};

export function uploadToPresignedUrl(request: UploadRequest): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(request.method ?? 'PUT', request.url);

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
