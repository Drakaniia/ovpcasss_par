import { Hono } from 'hono';

import type { AppEnv } from '../../env';

/** Auth endpoints: register, verify-email, login, logout, forgot/reset password (spec §7.3). Implemented in M1. */
export const authRoutes = new Hono<AppEnv>();
