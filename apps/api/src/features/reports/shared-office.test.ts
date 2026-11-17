import { createMiddleware } from 'hono/factory';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppEnv } from '../../env';

const store = vi.hoisted(() => ({
  row: {
    id: 'r1',
    status: 'APPROVED',
    version: 8,
    narrative: 'Old narrative',
    referenceNo: 'AR No. 0001',
    submittedByUserId: 'original-pic',
    approvedAt: '2026-03-20T00:00:00.000Z',
    approvedByUserId: 'admin-1',
  },
  setNarrative: vi.fn(),
  updateRecord: vi.fn(),
  replaceLists: vi.fn(),
  listPics: vi.fn(),
  listSdgIds: vi.fn(),
  audit: vi.fn(),
}));

vi.mock('../../middleware/auth', () => ({
  requireSession: createMiddleware<AppEnv>(async (c, next) => {
    c.set('userId', 'different-pic');
    c.set('role', (c.req.header('x-test-role') ?? 'PERSONNEL') as 'PERSONNEL');
    await next();
  }),
}));
vi.mock('@par/db', async (original) => ({
  ...(await original<typeof import('@par/db')>()),
  createDb: () => ({}),
  createReportReadQueries: () => ({
    findById: async () => store.row,
    listPics: store.listPics,
    listSdgIds: store.listSdgIds,
  }),
  createReportWriteQueries: () => ({
    setNarrative: store.setNarrative,
    updateRecord: store.updateRecord,
    replaceLists: store.replaceLists,
  }),
}));
vi.mock('../../lib/audit', () => ({ recordAudit: store.audit }));

import { reportRoutes } from './routes';

beforeEach(() => {
  vi.clearAllMocks();
  store.setNarrative.mockImplementation(async (input) => ({
    ...store.row,
    narrative: input.narrative,
    version: 9,
  }));
  store.updateRecord.mockResolvedValue({ ...store.row, title: 'New activity', version: 9 });
  store.listPics.mockResolvedValue([{ name: 'PIC' }]);
  store.listSdgIds.mockResolvedValue(['sdg1']);
});

function request(path: string, method: string, body: unknown, extra = {}) {
  return reportRoutes.request(
    path,
    {
      method,
      headers: { 'content-type': 'application/json', 'if-match': '8', ...extra },
      body: JSON.stringify(body),
    },
    { DB: {} },
  );
}

describe('shared-office approved edits', () => {
  it('saves another PIC’s approved narrative without changing its approval or submitter', async () => {
    const response = await request('/r1/narrative', 'PUT', { narrative: 'Updated narrative' });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: 'APPROVED', version: 9 });
    expect(store.setNarrative).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'r1',
        narrative: 'Updated narrative',
        version: 8,
        from: expect.arrayContaining(['APPROVED']),
      }),
    );
    const args = store.setNarrative.mock.calls[0]?.[0];
    expect(args).not.toHaveProperty('approvedAt');
    expect(args).not.toHaveProperty('submittedByUserId');
    const event = store.audit.mock.calls[0]?.[1];
    expect(event.actorUserId).toBe('different-pic');
    expect(JSON.parse(event.comment)).toMatchObject({
      before: { narrative: 'Old narrative' },
      after: { narrative: 'Updated narrative' },
    });
  });

  it('rejects a stale version without writing an audit event', async () => {
    store.setNarrative.mockResolvedValue(null);
    const response = await request('/r1/narrative', 'PUT', { narrative: 'Stale draft' });
    expect(response.status).toBe(409);
    expect(store.audit).not.toHaveBeenCalled();
  });

  it('saves approved activity details and preserves the decision', async () => {
    const form = {
      type: 'OFF_CAMPUS',
      classification: 'CURRICULAR',
      level: 'UNDERGRADUATE',
      title: 'New activity',
      activityStartDate: '2026-03-12',
      activityEndDate: '2026-03-12',
      location: 'Malaybalay',
      activityCount: 1,
      totalStudents: 10,
      totalPic: 1,
      pics: [{ name: 'PIC' }],
      sdgIds: ['sdg1'],
      reason: 'Correct activity details',
    };
    const response = await request('/r1', 'PATCH', form);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: 'APPROVED' });
    expect(store.updateRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        version: 8,
        from: expect.arrayContaining(['APPROVED']),
      }),
    );
    const event = store.audit.mock.calls[0]?.[1];
    expect(event.actorUserId).toBe('different-pic');
    expect(JSON.parse(event.comment).after.title).toBe('New activity');
  });

  it('never grants PERSONNEL approval or deletion rights', async () => {
    expect((await request('/r1/decision', 'POST', { decision: 'APPROVE' })).status).toBe(403);
    expect((await request('/r1', 'DELETE', {})).status).toBe(403);
  });
});
