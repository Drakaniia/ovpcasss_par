import { EMAIL_KIND_LABELS, EMAIL_KINDS, type EmailKind } from '@par/shared';
import {
  emailSamples,
  EMAIL_LOGO_PATH,
  escapeHtml,
  previewEmail,
  SAMPLE_ORIGIN,
  sampleFor,
} from '@par/email';
import { Hono } from 'hono';

import { loadEmailCopy } from '../email/copy-store';
import type { AppEnv } from '../env';

/**
 * Dev-only rendered preview (email spec D24, §17.2). The web app may not import
 * `@par/email`, so the templates are reviewed here instead: an index of every
 * kind and each message's own HTML, plus a `?format=text` plain-text sibling.
 * Mounted only when `DEV_EMAIL_PREVIEW === 'true'`; absent in production.
 */
export const devEmailRoutes = new Hono<AppEnv>();

devEmailRoutes.use('*', async (c, next): Promise<Response | void> => {
  if (c.env.DEV_EMAIL_PREVIEW !== 'true') {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Not found' } }, 404);
  }
  await next();
});

function page(body: string): Response {
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
      `<title>Email preview</title></head>` +
      `<body style="font-family:system-ui,sans-serif;margin:32px;line-height:1.5;">${body}</body></html>`,
    { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } },
  );
}

devEmailRoutes.get('/emails', () => {
  const rows = emailSamples()
    .map(
      (sample) =>
        `<tr><td><a href="/api/v1/dev/emails/${sample.kind}">${sample.kind}</a></td>` +
        `<td>${escapeHtml(EMAIL_KIND_LABELS[sample.kind])}</td>` +
        `<td>${escapeHtml(sample.audience)}</td>` +
        `<td>${escapeHtml(sample.content.subject)}</td></tr>`,
    )
    .join('');

  return page(
    `<h1>Email preview</h1>` +
      `<p>Every outbound kind, rendered from the sample dataset. Nothing is sent.</p>` +
      `<table cellpadding="6" cellspacing="0" border="0"><thead><tr>` +
      `<th align="left">Kind</th><th align="left">Label</th>` +
      `<th align="left">Audience</th><th align="left">Subject</th></tr></thead>` +
      `<tbody>${rows}</tbody></table>`,
  );
});

devEmailRoutes.get('/emails/:kind', async (c) => {
  const kind = c.req.param('kind') as EmailKind;
  if (!EMAIL_KINDS.includes(kind)) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'No such email kind' } }, 404);
  }

  const sample = sampleFor(kind);
  if (!sample) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'No such email kind' } }, 404);
  }

  // `?copy=saved` draws the administrator's saved words instead of the built-in
  // ones, so a developer sees exactly what a recipient receives.
  const stored = c.req.query('copy') === 'saved';
  const content = stored
    ? previewEmail(kind, (await loadEmailCopy(c.env)).get(kind), new URL(c.req.url).origin)
    : sample.content;

  if (c.req.query('format') === 'text') {
    return new Response(content.text, {
      headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
    });
  }

  // The sample dataset names a public example origin, which does not host the
  // build. This page comes from the Worker, which serves the web build too, so
  // the header logo loads from here while the rest of the sample stays as drawn.
  const origin = new URL(c.req.url).origin;
  const html = content.html.replaceAll(
    `${SAMPLE_ORIGIN}${EMAIL_LOGO_PATH}`,
    `${origin}${EMAIL_LOGO_PATH}`,
  );

  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  });
});
