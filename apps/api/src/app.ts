import { Hono } from 'hono';

import type { AppEnv } from './env';
import { acknowledgementRoutes } from './features/acknowledgement/routes';
import { approvalRoutes } from './features/approval/routes';
import { attachmentRoutes } from './features/attachments/routes';
import { auditRoutes } from './features/audit/routes';
import { authRoutes } from './features/auth/routes';
import { exportRoutes } from './features/exports/routes';
import { importRoutes } from './features/imports/routes';
import { inboxRoutes } from './features/inbox/routes';
import { notificationRoutes } from './features/notifications/routes';
import { profileRoutes } from './features/profile/routes';
import { approvalQueueRoutes, reviewQueueRoutes } from './features/queues/routes';
import { referenceDataRoutes } from './features/reference-data/routes';
import { reportRoutes } from './features/reports/routes';
import { reviewRoutes } from './features/review/routes';
import { searchRoutes } from './features/search/routes';
import { userRoutes } from './features/users/routes';
import { requireSameOrigin } from './middleware/csrf';
import { errorHandler } from './middleware/error-handler';

export const app = new Hono<AppEnv>();

app.onError(errorHandler);

app.get('/api/health', (c) => c.json({ status: 'ok' }));

const api = new Hono<AppEnv>();

// Cookie-authenticated writes must come from our own origin (spec §10).
api.use('*', requireSameOrigin);

api.route('/auth', authRoutes);
api.route('/users', userRoutes);
api.route('/ref', referenceDataRoutes);
api.route('/exports', exportRoutes);
api.route('/imports', importRoutes);
api.route('/search', searchRoutes);
api.route('/review', reviewQueueRoutes);
api.route('/approval', approvalQueueRoutes);
api.route('/audit', auditRoutes);
api.route('/me', profileRoutes);
api.route('/me', inboxRoutes);
api.route('/me', notificationRoutes);

// Report sub-resources share the /reports base (spec §7.3); Hono merges them.
api.route('/reports', reportRoutes);
api.route('/reports', reviewRoutes);
api.route('/reports', approvalRoutes);
api.route('/reports', attachmentRoutes);
api.route('/reports', acknowledgementRoutes);

app.route('/api/v1', api);
