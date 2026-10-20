import { Hono } from 'hono';

import type { AppEnv } from '../../env';
import { requireSession } from '../../middleware/auth';
import { requireRole } from '../../middleware/authorize';
import { handleDecision } from '../reports/application/decision-request';

/**
 * Reviewer decisions (spec §7.3). The route only names the action; the shared
 * workflow owns the target status, separation of duties, comments, and notices.
 */
export const reviewRoutes = new Hono<AppEnv>();

reviewRoutes.use('*', requireSession);

const reviewer = requireRole('REVIEWER');

reviewRoutes.post('/:id/endorse', reviewer, (c) => handleDecision(c, 'ENDORSE'));
reviewRoutes.post('/:id/return', reviewer, (c) => handleDecision(c, 'REVIEWER_RETURN'));
