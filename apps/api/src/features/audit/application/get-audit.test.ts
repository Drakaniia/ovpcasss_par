import type { AuditQueries } from '@par/db';
import type { Context } from 'hono';
import { describe, expect, it } from 'vitest';

import type { AppEnv } from '../../../env';
import { getAuditEvent, parsePayload, redactObject } from './get-audit';

describe('redactObject and parsePayload', () => {
  it('redacts sensitive keys', () => {
    const redacted = redactObject({
      name: 'Safe',
      password: 'plain',
      token: 'secret_tok',
      nested: {
        hash: 'abc',
        title: 'Report',
      },
    });

    const nested = redacted.nested as Record<string, unknown>;

    expect(redacted.name).toBe('Safe');
    expect(redacted.password).toBe('[redacted]');
    expect(redacted.token).toBe('[redacted]');
    expect(nested.hash).toBe('[redacted]');
    expect(nested.title).toBe('Report');
  });

  it('parses before and after JSON payload from comment', () => {
    const payload = JSON.stringify({
      before: { status: 'DRAFT', secret: '123' },
      after: { status: 'SUBMITTED', secret: '456' },
    });

    const parsed = parsePayload(payload);
    expect(parsed.before?.status).toBe('DRAFT');
    expect(parsed.before?.secret).toBe('[redacted]');
    expect(parsed.after?.status).toBe('SUBMITTED');
  });

  it('returns empty object for plain text comment', () => {
    expect(parsePayload('Plain comment')).toEqual({});
    expect(parsePayload(null)).toEqual({});
  });
});

describe('getAuditEvent', () => {
  it('loads event and formats detail via queries', async () => {
    const mockQueries = {
      findById: async (id: string) => ({
        id,
        actorUserId: 'u1',
        actorRole: 'ADMIN' as const,
        action: 'PROFILE_UPDATED',
        entityType: 'user',
        entityId: 'u1',
        fromStatus: null,
        toStatus: null,
        comment: JSON.stringify({
          before: { name: 'Old', password: 'plain' },
          after: { name: 'New' },
        }),
        ip: '127.0.0.1',
        userAgent: 'TestAgent',
        createdAt: '2026-10-17T06:02:00.000Z',
      }),
    } as unknown as AuditQueries;

    const mockContext = {} as Context<AppEnv>;

    const event = await getAuditEvent(mockContext, 'aud_123', mockQueries);
    expect(event).not.toBeNull();
    expect(event?.id).toBe('aud_123');
    expect(event?.before?.name).toBe('Old');
    expect(event?.before?.password).toBe('[redacted]');
    expect(event?.after?.name).toBe('New');
  });

  it('returns null when event not found', async () => {
    const mockQueries = {
      findById: async () => null,
    } as unknown as AuditQueries;

    const mockContext = {} as Context<AppEnv>;

    const event = await getAuditEvent(mockContext, 'missing', mockQueries);
    expect(event).toBeNull();
  });
});
