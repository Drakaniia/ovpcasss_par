import { Hono } from 'hono';

import { devEmailRoutes } from './dev/email-preview';
import type { AppEnv } from './env';
import { attachmentRoutes } from './features/attachments/routes';
import { auditRoutes } from './features/audit/routes';
import { authRoutes } from './features/auth/routes';
import { emailLogRoutes } from './features/emails/routes';
import { exportRoutes } from './features/exports/routes';
import { inboxRoutes } from './features/inbox/routes';
import { locationRoutes } from './features/locations/routes';
import { notificationRoutes } from './features/notifications/routes';
import { profileRoutes } from './features/profile/routes';
import { receiptRoutes } from './features/receipts/routes';
import { referenceDataRoutes } from './features/reference-data/routes';
import { reportRoutes } from './features/reports/routes';
import { searchRoutes } from './features/search/routes';
import { settingsRoutes } from './features/settings/routes';
import { userRoutes } from './features/users/routes';
import { desktopCors } from './middleware/cors';
import { requireSameOrigin } from './middleware/csrf';
import { errorHandler } from './middleware/error-handler';

export const app = new Hono<AppEnv>();

app.onError(errorHandler);

app.get('/api/health', (c) => c.json({ status: 'ok' }));

const api = new Hono<AppEnv>();

// The desktop shell calls the absolute API URL, so its requests are cross-origin.
api.use('*', desktopCors);

// Cookie-authenticated writes must come from our own origin (spec §10).
api.use('*', requireSameOrigin);

api.route('/auth', authRoutes);
api.route('/users', userRoutes);
api.route('/ref', referenceDataRoutes);
api.route('/exports', exportRoutes);
api.route('/search', searchRoutes);
api.route('/locations', locationRoutes);
api.route('/audit', auditRoutes);
api.route('/emails', emailLogRoutes);
api.route('/dev', devEmailRoutes);
api.route('/me', profileRoutes);
api.route('/me', inboxRoutes);
api.route('/me', notificationRoutes);
api.route('/receipts', receiptRoutes);
api.route('/settings', settingsRoutes);

// Report sub-resources share the /reports base (spec §7.3); Hono merges them.
api.route('/reports', reportRoutes);
api.route('/reports', attachmentRoutes);

app.route('/api/v1', api);
