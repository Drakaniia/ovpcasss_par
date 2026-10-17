import { Hono } from 'hono';

import type { AppEnv } from '../../env';

/** Current user, password change, and signature image (spec §7.3). Implemented in M1 and M4. */
export const profileRoutes = new Hono<AppEnv>();
