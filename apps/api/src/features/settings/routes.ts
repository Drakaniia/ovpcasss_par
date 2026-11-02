import { createDb, createSettingsQueries } from '@par/db';
import {
  emailSenderInputSchema,
  emailSenderSchema,
  emailTestInputSchema,
  receiptSignatorySchema,
  type EmailSender,
  type EmailSenderResponse,
  type EmailTestResponse,
  type ReceiptSignatory,
} from '@par/shared';
import { Hono } from 'hono';

import { emailSenderFor, senderKeyHint } from '../../email/sender';
import { sendTestEmail } from '../../email/test-send';
import type { AppEnv } from '../../env';
import { recordAudit } from '../../lib/audit';
import { consumeRateLimit } from '../../lib/rate-limit';
import { requireSession } from '../../middleware/auth';
import { requireRole } from '../../middleware/authorize';
import { receiptSignatoryFor } from './application/receipt-signatory';
import { registerEmailTemplateRoutes } from './email-template-routes';

/** Five test messages an hour per admin: enough to check a new key, not a relay. */
const EMAIL_TEST_LIMIT = 5;

/** The provider's own words are the useful part; keep them on one line. */
function reasonOf(error: unknown): string {
  const reason = error instanceof Error ? error.message : 'unknown';
  return reason.replace(/\s+/g, ' ').slice(0, 300);
}

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

/**
 * The sender and provider key (email spec §9.4, phase 17). Only an
 * administrator may read or change them: the key hint alone says which secret
 * is live. The key itself is never returned.
 */
settingsRoutes.get('/email-sender', requireRole('ADMIN'), async (c) => {
  const sender = await emailSenderFor(c.env);
  const response: EmailSenderResponse = {
    from: sender.from,
    apiKeySet: sender.apiKey.trim() !== '',
    apiKeyHint: senderKeyHint(sender.apiKey),
    source: sender.source,
    provider: c.env.EMAIL_PROVIDER,
  };

  return c.json(response);
});

settingsRoutes.put('/email-sender', requireRole('ADMIN'), async (c) => {
  const parsed = emailSenderInputSchema.safeParse(await c.req.json().catch(() => null));
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

  const queries = createSettingsQueries(createDb(c.env.DB));
  const stored = await queries.get<EmailSender>('email-sender');
  const saved = emailSenderSchema.safeParse(stored);
  const savedKey = saved.success ? saved.data.apiKey : undefined;
  // A blank field keeps the key already in use: the saved row when there is
  // one, and the deployment key otherwise. The page promises as much, so the
  // first save must not demand a secret the Worker is already sending with.
  const apiKey = parsed.data.apiKey?.trim() || savedKey || c.env.EMAIL_API_KEY?.trim();

  if (!apiKey) {
    return c.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Check the highlighted fields',
          details: [{ path: ['apiKey'], message: 'Enter the API key.' }],
        },
      },
      400,
    );
  }

  const sender: EmailSender = { from: parsed.data.from, apiKey };
  await queries.put({
    key: 'email-sender',
    value: sender,
    now: new Date().toISOString(),
    updatedByUserId: viewer,
  });

  await recordAudit(c, {
    actorUserId: viewer,
    actorRole: c.get('role'),
    action: 'SETTINGS_UPDATED',
    entityType: 'settings',
    entityId: 'email-sender',
    // The key is never written to the trail.
    comment: `Sending address ${sender.from}`,
  });

  const response: EmailSenderResponse = {
    from: sender.from,
    apiKeySet: true,
    apiKeyHint: senderKeyHint(apiKey),
    source: 'database',
    provider: c.env.EMAIL_PROVIDER,
  };

  return c.json(response);
});

/**
 * One test message through the pair in use (email spec §9.6). It reads the
 * saved row, never the form: the page's job is to prove the configuration a real
 * send would use. The provider's refusal is passed back verbatim, because
 * "unverified sender" and "key not found" are the two answers an administrator
 * needs to act on, and neither is visible anywhere else.
 */
settingsRoutes.post('/email-sender/test', requireRole('ADMIN'), async (c) => {
  const viewer = c.get('userId');
  if (!viewer) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Sign in to continue' } }, 401);
  }

  const parsed = emailTestInputSchema.safeParse(await c.req.json().catch(() => null));
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

  const limit = await consumeRateLimit(c.env, `email-test:${viewer}`, {
    limit: EMAIL_TEST_LIMIT,
    windowSeconds: 3600,
  });
  if (!limit.allowed) {
    return c.json(
      {
        error: {
          code: 'RATE_LIMITED',
          message: 'Five test messages an hour is the limit. Try again later.',
        },
      },
      429,
    );
  }

  try {
    const result = await sendTestEmail(c.env, parsed.data.to);
    const response: EmailTestResponse = { to: parsed.data.to, provider: result.provider };

    return c.json(response);
  } catch (error) {
    return c.json(
      {
        error: {
          code: 'EMAIL_TEST_FAILED',
          message: `The test message was not sent. ${reasonOf(error)}`,
        },
      },
      502,
    );
  }
});

registerEmailTemplateRoutes(settingsRoutes);
