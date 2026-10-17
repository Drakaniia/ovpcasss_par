import { Hono } from 'hono';

import type { AppEnv } from '../../env';

/** Draft create, edit, validate, submit, and resubmit (spec §7.3). Implemented in M3. */
export const reportRoutes = new Hono<AppEnv>();
