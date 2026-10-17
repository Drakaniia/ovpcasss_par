import type { ErrorEnvelope } from '@par/shared';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

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

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'content-type': 'application/json', ...init.headers },
  });

  if (!response.ok) {
    const envelope = (await response.json().catch(() => null)) as ErrorEnvelope | null;
    throw new ApiError(
      response.status,
      envelope?.error.code ?? 'UNKNOWN',
      envelope?.error.message ?? response.statusText,
      response.headers.get('x-request-id') ?? undefined,
    );
  }

  if (response.status === 204) return undefined as T;

  return (await response.json()) as T;
}
