import { Hono } from 'hono';

import type { AppEnv } from '../../env';

/** Presign, confirm, download URL, and delete (spec §7.8). Implemented in M3. */
export const attachmentRoutes = new Hono<AppEnv>();
