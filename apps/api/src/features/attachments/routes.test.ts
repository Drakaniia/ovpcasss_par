import { createMiddleware } from 'hono/factory';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppEnv } from '../../env';

const mocks = vi.hoisted(() => ({
  attachment: {
    id: 'a1',
    reportId: 'r1',
    label: 'Old label',
    originalName: 'evidence.pdf',
    objectKey: 'private-key',
    size: 12,
    mimeType: 'application/pdf',
    status: 'CONFIRMED',
    createdAt: '2026-03-12T00:00:00.000Z',
  },
  audit: vi.fn(),
  rename: vi.fn(),
  softDelete: vi.fn(),
}));
vi.mock('../../middleware/auth', () => ({
  requireSession: createMiddleware<AppEnv>(async (c, next) => {
    c.set('userId', 'different-pic');
    c.set('role', 'PERSONNEL');
    await next();
  }),
}));
vi.mock('../reports/application/report-context', () => ({
  viewerOf: () => ({ userId: 'different-pic', role: 'PERSONNEL' }),
  attachmentObjectKey: () => 'private-key',
  reportDependencies: () => ({
    read: {
      findById: async () => ({ id: 'r1', status: 'APPROVED', submittedByUserId: 'original' }),
    },
    attachments: {
      findById: async () => mocks.attachment,
      rename: mocks.rename,
      softDelete: mocks.softDelete,
    },
  }),
}));
vi.mock('../../lib/audit', () => ({ recordAudit: mocks.audit }));

import { attachmentRoutes } from './routes';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.rename.mockResolvedValue({ ...mocks.attachment, label: 'New label' });
  mocks.softDelete.mockResolvedValue({ ...mocks.attachment, status: 'DELETED' });
});

describe('shared-office attachment history', () => {
  it('audits an approved report attachment rename with actor and before/after metadata', async () => {
    const response = await attachmentRoutes.request('/r1/attachments/a1/confirm', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{"label":"New label"}',
    });
    expect(response.status).toBe(200);
    const event = mocks.audit.mock.calls[0]?.[1];
    expect(event).toMatchObject({
      actorUserId: 'different-pic',
      action: 'ATTACHMENT_RENAMED',
      entityType: 'report',
      entityId: 'r1',
    });
    expect(JSON.parse(event.comment)).toMatchObject({
      before: { label: 'Old label' },
      after: { label: 'New label' },
    });
    expect(event.comment).not.toContain('private-key');
  });

  it('audits deletion without changing approval state', async () => {
    const response = await attachmentRoutes.request(
      '/r1/attachments/a1',
      { method: 'DELETE' },
      { BUCKET: { delete: async () => {} } },
    );
    expect(response.status).toBe(204);
    const event = mocks.audit.mock.calls[0]?.[1];
    expect(event.action).toBe('ATTACHMENT_REMOVED');
    expect(JSON.parse(event.comment).after.status).toBe('DELETED');
    expect(event.comment).not.toContain('private-key');
  });
});
