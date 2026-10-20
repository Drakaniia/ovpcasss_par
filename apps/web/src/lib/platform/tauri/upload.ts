import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

/**
 * Streams a file the dialog picked straight from disk to the presigned URL
 * (phase 15 §2). Rust owns the request, so the 25 MB body never enters webview
 * memory; progress arrives as `attachment-progress` events keyed by upload id.
 */
export type PathUploadRequest = {
  url: string;
  method: string;
  headers: Record<string, string>;
  path: string;
  uploadId: string;
  onprogress?: (percent: number) => void;
};

type ProgressEvent = { uploadId: string; sent: number; total: number };

export async function uploadFromPath(request: PathUploadRequest): Promise<void> {
  const stop = await listen<ProgressEvent>('attachment-progress', (event) => {
    if (event.payload.uploadId !== request.uploadId) return;

    const total = Math.max(1, event.payload.total);
    request.onprogress?.(Math.min(100, Math.round((event.payload.sent / total) * 100)));
  });

  try {
    await invoke('upload_attachment', {
      request: {
        url: request.url,
        method: request.method,
        headers: Object.entries(request.headers),
        path: request.path,
        uploadId: request.uploadId,
      },
    });
    request.onprogress?.(100);
  } finally {
    stop();
  }
}
