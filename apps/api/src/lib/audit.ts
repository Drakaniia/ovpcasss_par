import { createAuditQueries, createDb, type NewAuditEventRow } from '@par/db';
import type { Context } from 'hono';

import type { AppEnv } from '../env';
import { createId } from './ids';
import { clientIp, clientUserAgent } from './request-context';

type AuditEventInput = Omit<NewAuditEventRow, 'id' | 'ip' | 'userAgent' | 'createdAt'>;

/**
 * The single append-only audit write path (spec §7.12). Caller facts are read
 * from the request and the id and timestamp are stamped here, so every event is
 * uniform and no route can write an incomplete row.
 */
export async function recordAudit(c: Context<AppEnv>, input: AuditEventInput): Promise<void> {
  await createAuditQueries(createDb(c.env.DB)).insert({
    ...input,
    id: createId(),
    ip: clientIp(c),
    userAgent: clientUserAgent(c),
    createdAt: new Date().toISOString(),
  });
}
