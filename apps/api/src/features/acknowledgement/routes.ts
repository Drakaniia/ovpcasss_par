import { Hono } from 'hono';

import type { AppEnv } from '../../env';

/** Acknowledgement PDF retrieval (spec §7.10). Implemented in M4. */
export const acknowledgementRoutes = new Hono<AppEnv>();
