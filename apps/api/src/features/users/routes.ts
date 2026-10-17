import { Hono } from 'hono';

import type { AppEnv } from '../../env';

/** Admin user management: list, role assignment, approve, disable (spec §7.3). Implemented in M1. */
export const userRoutes = new Hono<AppEnv>();
