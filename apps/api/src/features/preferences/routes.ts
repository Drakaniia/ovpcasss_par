import { createDb, createUserQueries } from '@par/db';
import { preferencesPatchSchema, preferencesSchema, type Preferences } from '@par/shared';
import { Hono, type Context } from 'hono';

import type { AppEnv } from '../../env';
import { requireSession } from '../../middleware/auth';

/**
 * The signed-in account's UI preferences (settings spec §7.14), mounted at
 * `/me`, so the record is always the session's own. Nothing is kept in browser
 * storage: zoom, the update choices and the onboarding record live on the users
 * row and follow the account to every shell and device.
 */
export const preferenceRoutes = new Hono<AppEnv>();

preferenceRoutes.use('*', requireSession);

preferenceRoutes.get('/preferences', async (c) => {
  const userId = c.get('userId');
  if (!userId) return unauthorized(c);

  const user = await createUserQueries(createDb(c.env.DB)).findById(userId);
  if (!user) return unauthorized(c);

  return c.json({ preferences: readStored(user.preferences) });
});

/** A patch: only the keys present are replaced, and the merged value returns. */
preferenceRoutes.put('/preferences', async (c) => {
  const userId = c.get('userId');
  if (!userId) return unauthorized(c);

  const parsed = preferencesPatchSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return invalid(c);

  const users = createUserQueries(createDb(c.env.DB));
  const user = await users.findById(userId);
  if (!user) return unauthorized(c);

  const { tour, ...rest } = parsed.data;
  const merged: Preferences = { ...readStored(user.preferences), ...rest };
  if (tour === null) delete merged.tour;
  else if (tour) merged.tour = tour;

  const saved = preferencesSchema.safeParse(merged);
  if (!saved.success) return invalid(c);

  await users.update(
    user.id,
    { preferences: JSON.stringify(saved.data) },
    new Date().toISOString(),
  );

  return c.json({ preferences: saved.data });
});

/** A row written by an older build (or edited by hand) reads as "no settings". */
function readStored(raw: string | null): Preferences {
  if (!raw) return {};

  try {
    const parsed = preferencesSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
}

function unauthorized(c: Context<AppEnv>) {
  return c.json(
    { error: { code: 'UNAUTHORIZED', message: 'Sign in to read your preferences' } },
    401,
  );
}

function invalid(c: Context<AppEnv>) {
  return c.json(
    { error: { code: 'VALIDATION_ERROR', message: 'Those preferences are not valid' } },
    400,
  );
}
