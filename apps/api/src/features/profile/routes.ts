import { Hono, type Context } from 'hono';

import { createDb, createSessionQueries, createUserQueries } from '@par/db';
import {
  changePasswordSchema,
  emailPreferencesInputSchema,
  signatureUploadSchema,
  updateProfileSchema,
} from '@par/shared';

import type { AppEnv } from '../../env';
import { recordAudit } from '../../lib/audit';
import { signedDownloadUrl } from '../../lib/download-url';
import { readSessionCookie } from '../../lib/session-cookie';
import { parseSignatureImage, profileSignatureKey } from '../../lib/signature-image';
import { requireSession } from '../../middleware/auth';
import { rateLimit } from '../../middleware/rate-limit';
import { createNotificationRepository } from '../notifications/infrastructure/notification-repository';
import {
  changePassword,
  getAccount,
  toEmailPreferences,
  updateEmailPreferences,
  updateProfile,
} from './application/profile';

/**
 * The signed-in account (spec §7.3, UI spec §7.14). Mounted at `/me`, so `GET /`
 * is `GET /me`. Every role may keep a signature: it signs approvals and is
 * offered while authoring a report (signature spec W2).
 */
export const profileRoutes = new Hono<AppEnv>();

profileRoutes.use('*', requireSession);

profileRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  if (!userId) return unauthorized(c);

  const db = createDb(c.env.DB);
  const account = await getAccount(createUserQueries(db), createNotificationRepository(db), userId);
  if (!account) return unauthorized(c);

  return c.json(account);
});

profileRoutes.patch('/', async (c) => {
  const userId = c.get('userId');
  if (!userId) return unauthorized(c);

  const parsed = updateProfileSchema.safeParse(await readBody(c));
  if (!parsed.success) return validationError(c, parsed.error.issues);

  const db = createDb(c.env.DB);
  const users = createUserQueries(db);
  const user = await users.findById(userId);
  if (!user) return unauthorized(c);

  const account = await updateProfile(users, user, parsed.data, new Date().toISOString());

  await recordAudit(c, {
    actorUserId: userId,
    actorRole: c.get('role'),
    action: 'PROFILE_UPDATED',
    entityType: 'user',
    entityId: userId,
  });

  return c.json(account);
});

/** The Email section on `/profile` (email spec §8, phase 17 §5). */
profileRoutes.get('/email-preferences', async (c) => {
  const userId = c.get('userId');
  if (!userId) return unauthorized(c);

  const user = await createUserQueries(createDb(c.env.DB)).findById(userId);
  if (!user) return unauthorized(c);

  return c.json(toEmailPreferences(user));
});

profileRoutes.patch('/email-preferences', async (c) => {
  const userId = c.get('userId');
  if (!userId) return unauthorized(c);

  const parsed = emailPreferencesInputSchema.safeParse(await readBody(c));
  if (!parsed.success) return validationError(c, parsed.error.issues);

  const users = createUserQueries(createDb(c.env.DB));
  const user = await users.findById(userId);
  if (!user) return unauthorized(c);

  return c.json(await updateEmailPreferences(users, user, parsed.data, new Date().toISOString()));
});

profileRoutes.post('/password', async (c) => {
  const userId = c.get('userId');
  if (!userId) return unauthorized(c);

  const parsed = changePasswordSchema.safeParse(await readBody(c));
  if (!parsed.success) return validationError(c, parsed.error.issues);

  const db = createDb(c.env.DB);
  const users = createUserQueries(db);
  const user = await users.findById(userId);
  if (!user) return unauthorized(c);

  const outcome = await changePassword(
    users,
    createSessionQueries(db),
    user,
    parsed.data,
    presentedToken(c),
    new Date().toISOString(),
  );

  if (outcome === 'wrong-current') {
    return c.json(
      {
        error: {
          code: 'PASSWORD_CURRENT_MISMATCH',
          message: 'The current password is incorrect.',
          details: [{ path: ['currentPassword'], message: 'The current password is incorrect.' }],
        },
      },
      400,
    );
  }

  await recordAudit(c, {
    actorUserId: userId,
    actorRole: c.get('role'),
    action: 'PASSWORD_CHANGED',
    entityType: 'user',
    entityId: userId,
  });

  return c.body(null, 204);
});

/**
 * Store or replace the caller's signature (signature spec §4.4). The previous
 * object is deleted only after the new key is written, so a failed write leaves
 * the old signature in place.
 */
profileRoutes.put('/signature', rateLimit({ limit: 20, windowSeconds: 60 }), async (c) => {
  const userId = c.get('userId');
  if (!userId) return unauthorized(c);

  const parsed = signatureUploadSchema.safeParse(await readBody(c));
  if (!parsed.success) return validationError(c, parsed.error.issues);

  const image = parseSignatureImage(parsed.data.image);
  if (!image) {
    return c.json(
      {
        error: {
          code: 'INVALID_SIGNATURE',
          message: 'Use a PNG or JPEG image under 2 MB.',
        },
      },
      400,
    );
  }

  const users = createUserQueries(createDb(c.env.DB));
  const user = await users.findById(userId);
  if (!user) return unauthorized(c);

  const key = profileSignatureKey(userId);
  await c.env.BUCKET.put(key, image.bytes, {
    httpMetadata: { contentType: image.mimeType },
  });

  const at = new Date().toISOString();
  const updated = await users.update(user.id, { signatureObjectKey: key }, at);
  if (!updated) return unauthorized(c);

  if (user.signatureObjectKey) {
    await c.env.BUCKET.delete(user.signatureObjectKey).catch(() => undefined);
  }

  await recordAudit(c, {
    actorUserId: userId,
    actorRole: c.get('role'),
    action: 'SIGNATURE_UPDATED',
    entityType: 'user',
    entityId: userId,
  });

  return c.json({ hasSignature: true, updatedAt: updated.updatedAt });
});

profileRoutes.delete('/signature', rateLimit({ limit: 20, windowSeconds: 60 }), async (c) => {
  const userId = c.get('userId');
  if (!userId) return unauthorized(c);

  const users = createUserQueries(createDb(c.env.DB));
  const user = await users.findById(userId);
  if (!user) return unauthorized(c);

  if (user.signatureObjectKey) {
    await c.env.BUCKET.delete(user.signatureObjectKey).catch(() => undefined);
  }

  await users.update(user.id, { signatureObjectKey: null }, new Date().toISOString());

  await recordAudit(c, {
    actorUserId: userId,
    actorRole: c.get('role'),
    action: 'SIGNATURE_REMOVED',
    entityType: 'user',
    entityId: userId,
  });

  return c.json({ hasSignature: false });
});

/** Short-lived URL for the profile card; 404 is the ordinary "none on file". */
profileRoutes.get('/signature/url', async (c) => {
  const userId = c.get('userId');
  if (!userId) return unauthorized(c);

  const user = await createUserQueries(createDb(c.env.DB)).findById(userId);
  if (!user) return unauthorized(c);
  if (!user.signatureObjectKey) return signatureMissing(c);

  const url = await signedDownloadUrl(c, user.signatureObjectKey, '/api/v1/me/signature/file');

  return c.json({ url, expiresAt: new Date(Date.now() + 5 * 60_000).toISOString() });
});

/** Storage-free fallback for `wrangler dev`, where R2 signing is unavailable. */
profileRoutes.get('/signature/file', async (c) => {
  const userId = c.get('userId');
  if (!userId) return unauthorized(c);

  const user = await createUserQueries(createDb(c.env.DB)).findById(userId);
  if (!user?.signatureObjectKey) return signatureMissing(c);

  const object = await c.env.BUCKET.get(user.signatureObjectKey);
  if (!object) return signatureMissing(c);

  return new Response(object.body as BodyInit, {
    status: 200,
    headers: {
      'content-type': object.httpMetadata?.contentType ?? 'image/png',
      'cache-control': 'private, no-store',
    },
  });
});

function signatureMissing(c: Context<AppEnv>) {
  return c.json({ error: { code: 'NOT_FOUND', message: 'No signature is on file' } }, 404);
}

function unauthorized(c: Context<AppEnv>) {
  return c.json(
    { error: { code: 'UNAUTHORIZED', message: 'Sign in to manage your profile' } },
    401,
  );
}

function validationError(c: Context<AppEnv>, issues: unknown[]) {
  return c.json(
    {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Check the highlighted fields',
        details: issues,
      },
    },
    400,
  );
}

async function readBody(c: Context<AppEnv>): Promise<unknown> {
  return c.req.json().catch(() => null);
}

/** Mirrors the session middleware's transport so the current session can be kept. */
function presentedToken(c: Context<AppEnv>): string | null {
  const [scheme, value] = (c.req.header('authorization') ?? '').split(' ');
  if (scheme?.toLowerCase() === 'bearer' && value) return value;

  return readSessionCookie(c) ?? null;
}
