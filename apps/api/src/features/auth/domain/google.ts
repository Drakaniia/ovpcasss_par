import type { UserStatus } from '@par/shared';

const AUTHORIZE_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';

export interface GoogleAuthUrlInput {
  clientId: string;
  redirectUri: string;
  state: string;
}

/** The consent-screen URL for the server-side code flow. */
export function buildGoogleAuthUrl({ clientId, redirectUri, state }: GoogleAuthUrlInput): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  });

  return `${AUTHORIZE_ENDPOINT}?${params}`;
}

/** ACTIVE lands in the app; every other status waits on the approval screen. */
export function googleLandingPath(status: UserStatus): string {
  return status === 'ACTIVE' ? '/' : '/awaiting-approval';
}

/**
 * The desktop shell has no cookie jar to hand the session to, so it opens a
 * loopback listener and asks for the token there (spec A7.4, RFC 8252). The
 * nonce is minted by the shell and echoed through the redirect, so a local
 * process that guesses the port still cannot collect the token.
 */
export interface DesktopStart {
  port: number;
  nonce: string;
}

const NONCE = /^[A-Za-z0-9_-]{16,64}$/;

/** Reads the desktop hand-off request; null when this is an ordinary web sign-in. */
export function parseDesktopStart(query: {
  client?: string | undefined;
  port?: string | undefined;
  nonce?: string | undefined;
}): DesktopStart | null {
  if (query.client !== 'desktop') return null;

  const port = Number(query.port);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) return null;
  if (!query.nonce || !NONCE.test(query.nonce)) return null;

  return { port, nonce: query.nonce };
}

/** The state cookie: bare state for the web, state plus hand-off details for desktop. */
export function encodeStateCookie(state: string, desktop: DesktopStart | null): string {
  return desktop ? `${state}|${desktop.port}|${desktop.nonce}` : state;
}

export function decodeStateCookie(value: string): {
  state: string;
  desktop: DesktopStart | null;
} {
  const [state, port, nonce] = value.split('|');
  const desktop = parseDesktopStart({ client: 'desktop', port, nonce });
  if (!state) return { state: '', desktop: null };
  return desktop ? { state, desktop } : { state: value, desktop: null };
}

/** Where the desktop shell collects the result: token on success, error code when not. */
export function desktopRedirect(
  desktop: DesktopStart,
  result: { token: string } | { error: string },
): string {
  const params = new URLSearchParams({ nonce: desktop.nonce });

  if ('token' in result) params.set('token', result.token);
  else params.set('error', result.error);

  return `http://127.0.0.1:${desktop.port}/?${params}`;
}
