import { createDb, createSettingsQueries } from '@par/db';
import { receiptSignatorySchema, type ReceiptSignatory } from '@par/shared';
import { Hono } from 'hono';

import type { AppEnv } from '../../env';
import { recordAudit } from '../../lib/audit';
import { requireSession } from '../../middleware/auth';
import { requireRole } from '../../middleware/authorize';
import { receiptSignatoryFor } from './application/receipt-signatory';

/**
 * Office-wide settings (report 9). Every signed-in account may read the
 * signatory, because the receipt preview shows it; only an administrator may
 * change it, and every change is audited.
 */
export const settingsRoutes = new Hono<AppEnv>();

settingsRoutes.use('*', requireSession);

settingsRoutes.get('/receipt-signatory', async (c) => {
  if (!c.get('userId')) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Sign in to continue' } }, 401);
  }

  return c.json({ signatory: await receiptSignatoryFor(c.env) });
});

settingsRoutes.put('/receipt-signatory', requireRole('ADMIN'), async (c) => {
  const parsed = receiptSignatorySchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Check the highlighted fields',
          details: parsed.error.issues,
        },
      },
      400,
    );
  }

  const viewer = c.get('userId');
  if (!viewer) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Sign in to continue' } }, 401);
  }

  const signatory: ReceiptSignatory = parsed.data;
  await createSettingsQueries(createDb(c.env.DB)).put({
    key: 'receipt-signatory',
    value: signatory,
    now: new Date().toISOString(),
    updatedByUserId: viewer,
  });

  await recordAudit(c, {
    actorUserId: viewer,
    actorRole: c.get('role'),
    action: 'SETTINGS_UPDATED',
    entityType: 'settings',
    entityId: 'receipt-signatory',
    comment: `${signatory.name}, ${signatory.title}`,
  });

  return c.json({ signatory });
});
