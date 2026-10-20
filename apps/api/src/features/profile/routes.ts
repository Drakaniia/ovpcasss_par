import { Hono, type Context } from 'hono';

import { createDb, createSessionQueries, createUserQueries } from '@par/db';
import { changePasswordSchema, updateProfileSchema } from '@par/shared';

import type { AppEnv } from '../../env';
import { recordAudit } from '../../lib/audit';
import { readSessionCookie } from '../../lib/session-cookie';
import { requireSession } from '../../middleware/auth';
import { createNotificationRepository } from '../notifications/infrastructure/notification-repository';
import { changePassword, getAccount, updateProfile } from './application/profile';

/**
 * The signed-in account (spec §7.3, UI spec §7.14). Mounted at `/me`, so `GET /`
 * is `GET /me`. Signature paths (`/me/signature*`) are M4 and deliberately absent.
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
          code: 'VALIDATION_ERROR',
          message: 'The current password is incorrect.',
          details: [
            { path: ['currentPassword'], message: 'The current password is incorrect.' },
          ],
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

function unauthorized(c: Context<AppEnv>) {
  return c.json({ error: { code: 'UNAUTHORIZED', message: 'Sign in to manage your profile' } }, 401);
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
