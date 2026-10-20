import type { Env } from '../../../env';
import { toHex } from '../../../lib/encoding';

/**
 * Presigned PUT for R2's S3-compatible API (spec §7.8). Workers have no
 * presigner for R2's S3 endpoint, so the SigV4 query form is built here with
 * WebCrypto. Only the host is signed; the client may send its own content type.
 */
const REGION = 'auto';
const SERVICE = 's3';
const ALGORITHM = 'AWS4-HMAC-SHA256';

export class PresignUnavailableError extends Error {
  constructor() {
    super('Object storage signing is not configured');
    this.name = 'PresignUnavailableError';
  }
}

/** `.dev.vars.example` ships these placeholders; signing cannot work with them. */
const PLACEHOLDER = 'replace-me';

/**
 * Whether the S3-compatible endpoint can be signed for. When it cannot, uploads
 * go through the API instead, so local development needs no R2 API token.
 */
export function signingConfigured(env: Env): boolean {
  return [env.R2_ACCOUNT_ID, env.R2_ACCESS_KEY_ID, env.R2_SECRET_ACCESS_KEY].every(
    (value) => typeof value === 'string' && value !== '' && value !== PLACEHOLDER,
  );
}

export interface PresignedUpload {
  uploadUrl: string;
  headers: Record<string, string>;
}

async function presign(
  env: Env,
  method: 'GET' | 'PUT',
  key: string,
  expiresSeconds = 900,
): Promise<string> {
  if (!signingConfigured(env)) throw new PresignUnavailableError();

  const accessKeyId = env.R2_ACCESS_KEY_ID;
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY;
  const accountId = env.R2_ACCOUNT_ID;

  const bucket = env.R2_BUCKET_NAME ?? 'par-attachments';
  const host = `${accountId}.r2.cloudflarestorage.com`;
  const canonicalUri = `/${encodeSegment(bucket)}/${key.split('/').map(encodeSegment).join('/')}`;
  const now = new Date();
  /** `20261019T123456Z`: the actual signing time, not midnight. */
  const amzDate = now.toISOString().replaceAll(/[:-]|\.\d{3}/g, '');
  const date = amzDate.slice(0, 8);
  const scope = `${date}/${REGION}/${SERVICE}/aws4_request`;

  const params = new Map<string, string>([
    ['X-Amz-Algorithm', ALGORITHM],
    ['X-Amz-Credential', `${accessKeyId}/${scope}`],
    ['X-Amz-Date', amzDate],
    ['X-Amz-Expires', String(expiresSeconds)],
    ['X-Amz-SignedHeaders', 'host'],
  ]);
  const canonicalQuery = [...params.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, value]) => `${encodeSegment(name)}=${encodeSegment(value)}`)
    .join('&');

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuery,
    `host:${host}\n`,
    'host',
    'UNSIGNED-PAYLOAD',
  ].join('\n');

  const stringToSign = [ALGORITHM, amzDate, scope, toHex(await sha256(canonicalRequest))].join(
    '\n',
  );

  const signature = toHex(await hmacChain(secretAccessKey, date, stringToSign));
  return `https://${host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

export async function presignPut(
  env: Env,
  key: string,
  options: { mimeType: string; expiresSeconds?: number },
): Promise<PresignedUpload> {
  const uploadUrl = await presign(env, 'PUT', key, options.expiresSeconds);

  return {
    uploadUrl,
    headers: { 'content-type': options.mimeType },
  };
}

export async function presignGet(env: Env, key: string, expiresSeconds = 300): Promise<string> {
  return presign(env, 'GET', key, expiresSeconds);
}

function encodeSegment(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

async function sha256(value: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
}

async function hmac(key: ArrayBuffer | Uint8Array, value: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(value));
}

async function hmacChain(secret: string, date: string, value: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const dateKey = await hmac(encoder.encode(`AWS4${secret}`), date);
  const regionKey = await hmac(dateKey, REGION);
  const serviceKey = await hmac(regionKey, SERVICE);
  const signingKey = await hmac(serviceKey, 'aws4_request');
  return hmac(signingKey, value);
}
