import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';

import { desktopCors } from './cors';

const app = new Hono();
app.use('*', desktopCors);
app.post('/login', (c) => c.json({ ok: true }));

describe('desktopCors', () => {
  it('answers the preflight the desktop shell sends', async () => {
    const response = await app.request('/login', {
      method: 'OPTIONS',
      headers: {
        origin: 'http://tauri.localhost',
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type,x-par-client',
      },
    });

    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-origin')).toBe('http://tauri.localhost');
    expect(response.headers.get('access-control-allow-credentials')).toBe('true');
  });

  it('does not grant an unknown origin', async () => {
    const response = await app.request('/login', {
      method: 'POST',
      headers: { origin: 'https://evil.example' },
    });

    expect(response.headers.get('access-control-allow-origin')).toBeNull();
  });
});
