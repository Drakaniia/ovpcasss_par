import { Hono } from 'hono';

import type { AppEnv } from '../../env';

/** Approver approve and return-for-revision actions (spec §7.3). Implemented in M4. */
export const approvalRoutes = new Hono<AppEnv>();
