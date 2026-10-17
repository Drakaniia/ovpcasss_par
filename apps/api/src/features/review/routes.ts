import { Hono } from 'hono';

import type { AppEnv } from '../../env';

/** Reviewer return-with-comments and endorse actions (spec §7.3). Implemented in M4. */
export const reviewRoutes = new Hono<AppEnv>();
