import { Hono } from 'hono';

import type { AppEnv } from '../../env';

/** Admin audit log and per-report timeline (spec §7.12). Implemented in M5. */
export const auditRoutes = new Hono<AppEnv>();
