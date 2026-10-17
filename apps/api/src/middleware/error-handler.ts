import type { ErrorHandler } from 'hono';

/** Keeps error responses on the shared envelope and logs without PII (spec §7.2). */
export const errorHandler: ErrorHandler = (err, c) => {
  console.error(JSON.stringify({ level: 'error', message: err.message }));

  return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Unexpected error' } }, 500);
};
