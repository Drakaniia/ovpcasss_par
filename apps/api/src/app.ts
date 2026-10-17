import { Hono } from 'hono';

import type { AppEnv } from './env';
import { acknowledgementRoutes } from './features/acknowledgement/routes';
import { approvalRoutes } from './features/approval/routes';
import { attachmentRoutes } from './features/attachments/routes';
import { auditRoutes } from './features/audit/routes';
import { authRoutes } from './features/auth/routes';
import { exportRoutes } from './features/exports/routes';
import { profileRoutes } from './features/profile/routes';
import { referenceDataRoutes } from './features/reference-data/routes';
import { reportRoutes } from './features/reports/routes';
import { reviewRoutes } from './features/review/routes';
import { searchRoutes } from './features/search/routes';
import { userRoutes } from './features/users/routes';
import { errorHandler } from './middleware/error-handler';

export const app = new Hono<AppEnv>();

app.onError(errorHandler);

app.get('/api/health', (c) => c.json({ status: 'ok' }));

const api = new Hono<AppEnv>();

api.route('/auth', authRoutes);
api.route('/users', userRoutes);
api.route('/ref', referenceDataRoutes);
api.route('/exports', exportRoutes);
api.route('/search', searchRoutes);
api.route('/audit', auditRoutes);
api.route('/me', profileRoutes);

// Report sub-resources share the /reports base (spec §7.3); Hono merges them.
api.route('/reports', reportRoutes);
api.route('/reports', reviewRoutes);
api.route('/reports', approvalRoutes);
api.route('/reports', attachmentRoutes);
api.route('/reports', acknowledgementRoutes);

app.route('/api/v1', api);
