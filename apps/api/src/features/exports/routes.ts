import { Hono } from 'hono';

import type { AppEnv } from '../../env';

/** Monitoring sheet exports (spec §7.13). Implemented in M6. */
export const exportRoutes = new Hono<AppEnv>();
