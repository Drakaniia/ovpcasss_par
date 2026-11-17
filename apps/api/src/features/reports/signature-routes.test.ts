import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';

import type { AppEnv } from '../../env';

const audit = vi.hoisted(() => vi.fn());
vi.mock('../../middleware/rate-limit', () => ({
  rateLimit: () => async (_c: unknown, next: () => Promise<void>) => next(),
}));
vi.mock('../../lib/audit', () => ({ recordAudit: audit }));
vi.mock('./application/report-detail', () => ({
  buildReportDetail: async () => ({ status: 'APPROVED' }),
}));
vi.mock('./application/report-context', () => ({
  viewerOf: () => ({ userId: 'editing-pic', role: 'PERSONNEL' }),
  reportDependencies: () => ({
    read: {
      findById: async () => ({
        id: 'r1',
        status: 'APPROVED',
        narrativeSignatureKey: 'private-key',
        narrativeSignedAt: '2026-03-12T00:00:00.000Z',
      }),
      isPic: async () => false,
    },
    write: { setSignature: async () => ({ id: 'r1' }) },
  }),
}));
import { registerReportSignatureRoutes } from './signature-routes';

describe('shared-office signature history', () => {
  it('records signature removal on an approved report without storing image keys', async () => {
    const app = new Hono<AppEnv>();
    registerReportSignatureRoutes(app);
    const response = await app.request(
      '/r1/signature',
      { method: 'DELETE' },
      { BUCKET: { delete: async () => {} } },
    );
    expect(response.status).toBe(200);
    const event = audit.mock.calls[0]?.[1];
    expect(event).toMatchObject({
      actorUserId: 'editing-pic',
      action: 'SIGNATURE_REMOVED',
      entityId: 'r1',
    });
    expect(JSON.parse(event.comment)).toMatchObject({
      before: { imagePresent: true },
      after: { imagePresent: false },
    });
    expect(event.comment).not.toContain('private-key');
  });
});
