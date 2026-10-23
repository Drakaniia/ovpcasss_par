/**
 * The Pages site's door to the API (spec §7.1).
 *
 * The web build authenticates with a `SameSite=Lax` cookie and the API rejects a
 * cookie write whose `Origin` host differs from the request host, so the browser
 * must keep seeing one origin. This Function forwards `/api/*` to the Worker and
 * returns its response untouched, which keeps `Set-Cookie`, redirects, and
 * streamed downloads exactly as the Worker sent them.
 *
 * Two headers make the proxy trustworthy at the other end:
 * - `x-par-proxy-token` proves the request came through this deployment, so the
 *   API can accept it as same-origin and read the forwarded address.
 * - `x-par-forwarded-for` carries the browser's address, which would otherwise
 *   be this Function's (per-IP rate limits are 20 sign-ins per 15 minutes).
 */

const DEFAULT_API_ORIGIN = 'https://par.ovpcasss.workers.dev';

interface ProxyEnv {
  /** Overrides the Worker origin; local `wrangler pages dev` points it at 8787. */
  API_ORIGIN?: string;
  /** Shared with the API; set with `wrangler pages secret put PROXY_TOKEN`. */
  PROXY_TOKEN?: string;
}

interface PagesContext {
  request: Request;
  env: ProxyEnv;
}

export async function onRequest({ request, env }: PagesContext): Promise<Response> {
  const url = new URL(request.url);
  const headers = new Headers(request.headers);
  headers.delete('host');

  const clientIp = request.headers.get('cf-connecting-ip');
  if (clientIp) headers.set('x-par-forwarded-for', clientIp);
  if (env.PROXY_TOKEN) headers.set('x-par-proxy-token', env.PROXY_TOKEN);

  return fetch(new URL(url.pathname + url.search, env.API_ORIGIN ?? DEFAULT_API_ORIGIN), {
    method: request.method,
    headers,
    body: request.body,
    redirect: 'manual',
  });
}
