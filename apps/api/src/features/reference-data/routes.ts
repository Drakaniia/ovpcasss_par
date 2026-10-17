import { Hono } from 'hono';

import type { AppEnv } from '../../env';

/** Reference data reads for all users and admin writes (spec §7.3). Implemented in M2. */
export const referenceDataRoutes = new Hono<AppEnv>();
