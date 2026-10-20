import type { ErrorEnvelope } from '@par/shared';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

/**
 * The desktop bearer token, held in memory only (spec §7.4). It is loaded from
 * the OS credential store at startup and cleared on sign-out; the browser never
 * sets it, so the web build keeps its HttpOnly cookie.
 */
let sessionToken: string | null = null;

export function setSessionToken(token: string | null): void {
  sessionToken = token;
}

/** The desktop shell identifies itself so login may return the token. */
export function isDesktopShell(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/**
 * The bearer header for uploads that bypass `apiFetch` (spec §7.8). The desktop
 * shell holds a token instead of a cookie, so the API's storage fallback — which
 * answers to the session — needs the token on the PUT itself.
 */
export function sessionAuthHeaders(): Record<string, string> {
  return sessionToken ? { authorization: `Bearer ${sessionToken}` } : {};
}

/** Adds the auth and shell headers without overriding a caller's own header. */
function authHeaders(init: RequestInit): Headers {
  const headers = new Headers(init.headers);
  if (sessionToken) headers.set('authorization', `Bearer ${sessionToken}`);
  if (isDesktopShell()) headers.set('x-par-client', 'desktop');
  return headers;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    /** Response request id, shown in error states when the API supplies one. */
    readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function errorFrom(response: Response): Promise<ApiError> {
  const envelope = (await response.json().catch(() => null)) as ErrorEnvelope | null;
  return new ApiError(
    response.status,
    envelope?.error.code ?? 'UNKNOWN',
    envelope?.error.message ?? response.statusText,
    response.headers.get('x-request-id') ?? undefined,
  );
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: (() => {
      const headers = authHeaders(init);
      if (!headers.has('content-type')) headers.set('content-type', 'application/json');
      return headers;
    })(),
  });

  if (!response.ok) throw await errorFrom(response);
  if (response.status === 204) return undefined as T;

  return (await response.json()) as T;
}

/** Downloads a binary response; the caller triggers the save with `saveBlob`. */
export async function apiDownload(path: string, init: RequestInit = {}): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: authHeaders(init),
  });

  if (!response.ok) throw await errorFrom(response);

  return response.blob();
}

/** Multipart upload; the browser sets the boundary, so no content type here. */
export async function apiUpload<T>(
  path: string,
  form: FormData,
  init: Pick<RequestInit, 'headers'> = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    body: form,
    credentials: 'include',
    headers: authHeaders(init),
  });

  if (!response.ok) throw await errorFrom(response);

  return (await response.json()) as T;
}

/** Saves a downloaded blob under a user-visible filename. */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
