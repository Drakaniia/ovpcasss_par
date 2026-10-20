import { Hono } from 'hono';

import type { AppEnv } from '../../env';
import { requireSession } from '../../middleware/auth';
import { requireRole } from '../../middleware/authorize';
import { handleDecision } from '../reports/application/decision-request';

/**
 * Approver decisions (spec §7.3). Approval records the officer and generates the
 * acknowledgement; returning sends the report back through review.
 */
export const approvalRoutes = new Hono<AppEnv>();

approvalRoutes.use('*', requireSession);

const approver = requireRole('APPROVER');

approvalRoutes.post('/:id/approve', approver, (c) => handleDecision(c, 'APPROVE'));
approvalRoutes.post('/:id/return-for-revision', approver, (c) =>
  handleDecision(c, 'APPROVER_RETURN'),
);
