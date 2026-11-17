import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

/** Reject SPA fallbacks even when Pages answers API requests with HTTP 200. */
export async function checkPages(origin, request = fetch) {
  const json = async (path, status) => {
    const response = await request(new URL(path, origin), {
      headers: { accept: 'application/json', 'cache-control': 'no-cache' },
      signal: AbortSignal.timeout(15_000),
    });
    assert.equal(response.status, status, `${path}: unexpected HTTP status`);
    assert.match(
      response.headers.get('content-type') ?? '',
      /application\/json/i,
      `${path}: expected JSON, not the SPA fallback`,
    );
    return response.json();
  };
  assert.deepEqual(await json('/api/health', 200), { status: 'ok' });
  const config = await json('/api/v1/auth/config', 200);
  assert.equal(typeof config.googleEnabled, 'boolean', 'Auth config did not reach the API');
  const session = await json('/api/v1/me', 401);
  assert.equal(session.error?.code, 'UNAUTHORIZED');
  const page = await request(new URL('/login', origin), { signal: AbortSignal.timeout(15_000) });
  assert.equal(page.status, 200, 'Sign-in page unavailable');
  assert.match(page.headers.get('content-type') ?? '', /text\/html/i);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const origin = process.argv[2];
  assert.ok(origin, 'Usage: node scripts/check-pages.mjs https://<project>.pages.dev');
  for (let attempt = 1; ; attempt++) {
    try {
      await checkPages(origin);
      console.log(
        `PASS: Pages API health, auth configuration, session gate, and sign-in page (${origin})`,
      );
      break;
    } catch (error) {
      if (attempt === 5) throw error;
      console.log(`Pages smoke check ${attempt}/5 did not pass; retrying propagation.`);
      await new Promise((resolve) => setTimeout(resolve, 3_000));
    }
  }
}
