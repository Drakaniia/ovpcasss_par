import { cors } from 'hono/cors';

/**
 * The desktop webview's origin: `tauri://localhost` elsewhere, and the two
 * http(s) forms Windows uses. The web build is same-origin, so it needs none.
 */
const DESKTOP_ORIGINS = new Set([
  'tauri://localhost',
  'http://tauri.localhost',
  'https://tauri.localhost',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

/** Grants the cross-origin desktop shell its bearer requests and preflights. */
export const desktopCors = cors({
  origin: (origin) => (DESKTOP_ORIGINS.has(origin) ? origin : null),
  credentials: true,
  allowHeaders: ['authorization', 'content-type', 'if-match', 'idempotency-key', 'x-par-client'],
  exposeHeaders: ['x-request-id', 'content-disposition'],
});
