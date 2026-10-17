import { Hono } from 'hono';

import type { AppEnv } from '../../env';

/** Repository search with filters (spec §7.11). Implemented in M5. */
export const searchRoutes = new Hono<AppEnv>();
