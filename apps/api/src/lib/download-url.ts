import type { Context } from 'hono';

import type { AppEnv } from '../env';
import {
  PresignUnavailableError,
  presignGet,
} from '../features/attachments/infrastructure/r2-presign';

/**
 * A URL a browser or the desktop shell can fetch without attaching the session.
 * Production gets a short-lived presigned R2 URL, which works from the Tauri
 * origin too. A loopback request keeps the authenticated in-app URL: `wrangler
 * dev` serves R2 locally, so the public S3 endpoint has no object to hand back.
 */
export async function signedDownloadUrl(
  c: Context<AppEnv>,
  objectKey: string,
  fallbackPath: string,
  expiresSeconds = 300,
): Promise<string> {
  const fallback = new URL(fallbackPath, c.req.url).toString();
  if (isLoopback(c.req.url)) return fallback;

  try {
    return await presignGet(c.env, objectKey, expiresSeconds);
  } catch (error) {
    if (error instanceof PresignUnavailableError) return fallback;
    throw error;
  }
}

function isLoopback(url: string): boolean {
  const { hostname } = new URL(url);
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}
