import { createDb } from '@par/db';
import type { ReferenceEntityKey } from '@par/shared';
import { Hono, type Context } from 'hono';

import type { AppEnv } from '../../env';
import { recordAudit } from '../../lib/audit';
import { requireSession } from '../../middleware/auth';
import { requireRole } from '../../middleware/authorize';
import {
  activateReference,
  createReference,
  deactivateReference,
  getReference,
  listReference,
  parseReferenceInput,
  updateReference,
} from './application/reference-crud';
import { isReferenceEntityKey } from './domain/reference-entry';
import { createReferenceRepository } from './infrastructure/reference-repository';

/**
 * Reference data: any signed-in user reads the dropdowns the PAR form needs,
 * admins maintain them (spec §7.3). Deactivating keeps a row so reports that
 * already point at it stay resolvable.
 */
export const referenceDataRoutes = new Hono<AppEnv>();

referenceDataRoutes.use('*', requireSession);

function repository(c: Context<AppEnv>) {
  return createReferenceRepository(createDb(c.env.DB));
}

function unauthorized(c: Context<AppEnv>) {
  return c.json(
    { error: { code: 'UNAUTHORIZED', message: 'Sign in to view reference data' } },
    401,
  );
}

function unknownEntity(c: Context<AppEnv>) {
  return c.json(
    { error: { code: 'NOT_FOUND', message: 'That reference list does not exist' } },
    404,
  );
}

function entityParam(c: Context<AppEnv>): ReferenceEntityKey | null {
  const entity = c.req.param('entity');
  return entity && isReferenceEntityKey(entity) ? entity : null;
}

function validationError(c: Context<AppEnv>, issues: unknown[]) {
  return c.json(
    {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'That entry is not valid',
        details: issues,
      },
    },
    400,
  );
}

function notFound(c: Context<AppEnv>) {
  return c.json(
    { error: { code: 'NOT_FOUND', message: 'This reference entry does not exist' } },
    404,
  );
}

function audit(c: Context<AppEnv>, action: string, entity: string, entityId?: string) {
  return recordAudit(c, {
    actorUserId: c.get('userId'),
    actorRole: c.get('role'),
    action,
    entityType: 'reference_data',
    comment: entity,
    ...(entityId === undefined ? {} : { entityId }),
  });
}

/** Registered before `POST /:entity` so the static path wins. */
referenceDataRoutes.post('/seed', requireRole('ADMIN'), async (c) => {
  await repository(c).seed();
  await audit(c, 'REFERENCE_SEEDED', 'reference_data');
  return c.json({ seeded: true });
});

referenceDataRoutes.get('/:entity', async (c) => {
  if (!c.get('userId')) return unauthorized(c);

  const entity = entityParam(c);
  if (!entity) return unknownEntity(c);

  return c.json({ items: await listReference(repository(c), entity) });
});

referenceDataRoutes.get('/:entity/:id', async (c) => {
  if (!c.get('userId')) return unauthorized(c);

  const entity = entityParam(c);
  if (!entity) return unknownEntity(c);

  const entry = await getReference(repository(c), entity, c.req.param('id'));
  if (!entry) return notFound(c);

  return c.json(entry);
});

referenceDataRoutes.post('/:entity', requireRole('ADMIN'), async (c) => {
  const entity = entityParam(c);
  if (!entity) return unknownEntity(c);

  const body = await c.req.json().catch(() => null);
  const parsed = parseReferenceInput(entity, body);
  if (!parsed.ok) return validationError(c, parsed.issues);

  const entry = await createReference(repository(c), entity, parsed.data);
  await audit(c, 'REFERENCE_CREATED', entity, entry.id);

  return c.json(entry, 201);
});

referenceDataRoutes.patch('/:entity/:id', requireRole('ADMIN'), async (c) => {
  const entity = entityParam(c);
  if (!entity) return unknownEntity(c);

  const body = await c.req.json().catch(() => null);
  const parsed = parseReferenceInput(entity, body);
  if (!parsed.ok) return validationError(c, parsed.issues);

  const entry = await updateReference(repository(c), entity, c.req.param('id'), parsed.data);
  if (!entry) return notFound(c);

  await audit(c, 'REFERENCE_UPDATED', entity, entry.id);

  return c.json(entry);
});

referenceDataRoutes.delete('/:entity/:id', requireRole('ADMIN'), async (c) => {
  const entity = entityParam(c);
  if (!entity) return unknownEntity(c);

  const entry = await deactivateReference(repository(c), entity, c.req.param('id'));
  if (!entry) return notFound(c);

  await audit(c, 'REFERENCE_DEACTIVATED', entity, entry.id);

  return c.json(entry);
});

referenceDataRoutes.post('/:entity/:id/activate', requireRole('ADMIN'), async (c) => {
  const entity = entityParam(c);
  if (!entity) return unknownEntity(c);

  const entry = await activateReference(repository(c), entity, c.req.param('id'));
  if (!entry) return notFound(c);

  await audit(c, 'REFERENCE_ACTIVATED', entity, entry.id);

  return c.json(entry);
});
