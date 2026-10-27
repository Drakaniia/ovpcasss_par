import type { AttachmentRow, ReportCommentRow, ReportPicRow, ReportRow } from '@par/db';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/** The database stack is replaced; this test is about what leaves the API. */
const db = vi.hoisted(() => ({
  read: {
    listPics: vi.fn(),
    listSdgIds: vi.fn(),
    listAttachments: vi.fn(),
    listComments: vi.fn(),
  },
  receipts: { listForReport: vi.fn() },
  users: { findById: vi.fn() },
  audit: { listForEntity: vi.fn() },
}));

vi.mock('@par/db', () => ({
  createDb: () => ({}),
  createReportReadQueries: () => db.read,
  createReceiptQueries: () => db.receipts,
  createUserQueries: () => db.users,
  createAuditQueries: () => db.audit,
}));

import type { Env } from '../../../env';
import { buildReportDetail } from './report-detail';

const row: ReportRow = {
  id: 'r1',
  referenceNo: 'AR No. 0001',
  sequence: 1,
  type: 'OFF_CAMPUS',
  status: 'SUBMITTED',
  version: 3,
  createdByUserId: 'admin-1',
  classification: 'CURRICULAR',
  campusId: 'c1',
  unitId: 'u1',
  department: null,
  office: null,
  level: 'UNDERGRADUATE',
  title: 'Coastal cleanup',
  activityStartDate: '2026-03-12',
  activityEndDate: '2026-03-13',
  location: 'Barangay Casisang, Malaybalay City',
  activityCount: 1,
  totalStudents: 40,
  totalPic: 2,
  narrative: 'The team collected waste along the breakwater.',
  draftForm: null,
  submittedByUserId: 'person-1',
  narrativeSignatureKey: 'reports/r1/signature',
  narrativeSignedAt: '2026-03-14T01:10:00.000Z',
  narrativeSignatureCleared: false,
  approvalSignatureKey: null,
  approvalSignedAt: null,
  submittedAt: '2026-03-14T01:12:00.000Z',
  approvedAt: null,
  approvedByUserId: null,
  completedOn: null,
  archivedAt: null,
  archivedByUserId: null,
  createdAt: '2026-03-10T02:00:00.000Z',
  updatedAt: '2026-03-14T01:12:00.000Z',
};

const pic: ReportPicRow = {
  id: 'p1',
  reportId: 'r1',
  userId: 'person-1',
  name: 'M. Santos',
  email: 'santos@buksu.edu.ph',
  phone: null,
  sortOrder: 0,
  invitedAt: '2026-03-10T02:00:00.000Z',
};

const attachment = {
  id: 'a1',
  reportId: 'r1',
  label: 'Attendance sheet',
  originalName: 'attendance.pdf',
  objectKey: 'reports/r1/a1',
  size: 2048,
  mimeType: 'application/pdf',
  status: 'CONFIRMED',
  uploadedByUserId: 'person-1',
  sha256: null,
  createdAt: '2026-03-13T08:00:00.000Z',
  updatedAt: '2026-03-13T08:01:00.000Z',
} as AttachmentRow;

const returnComment = {
  id: 'c1',
  reportId: 'r1',
  authorUserId: 'admin-1',
  kind: 'RETURN',
  round: 1,
  body: 'Cite the number of participants in the second paragraph.',
  createdAt: '2026-03-15T02:00:00.000Z',
} as ReportCommentRow;

const env = { DB: {} } as unknown as Env;

const options = (concealNarrative: boolean) => ({
  canWriteNarrative: false,
  canManage: false,
  canArchive: false,
  canSetCompletedDate: false,
  concealNarrative,
});

beforeEach(() => {
  db.read.listPics.mockResolvedValue([pic]);
  db.read.listSdgIds.mockResolvedValue(['sdg-1']);
  db.read.listAttachments.mockResolvedValue([attachment]);
  db.read.listComments.mockResolvedValue([returnComment]);
  db.receipts.listForReport.mockResolvedValue([]);
  db.users.findById.mockResolvedValue({
    id: 'admin-1',
    fullName: 'A. Reyes',
    signatureObjectKey: null,
  });
  db.audit.listForEntity.mockResolvedValue([
    {
      id: 'e1',
      entityType: 'report',
      entityId: 'r1',
      actorUserId: 'admin-1',
      actorRole: 'ADMIN',
      action: 'NARRATIVE_RETURNED',
      fromStatus: 'SUBMITTED',
      toStatus: 'RETURNED',
      comment: 'Cite the number of participants in the second paragraph.',
      createdAt: '2026-03-15T02:00:00.000Z',
    },
  ]);
});

describe('report detail privacy', () => {
  it('hands the submitter the narrative, its files, and its signature', async () => {
    const detail = await buildReportDetail(env, row, options(false));

    expect(detail.narrativePrivate).toBe(false);
    expect(detail.form.narrative).toContain('breakwater');
    expect(detail.attachments.map((entry) => entry.originalName)).toEqual(['attendance.pdf']);
    expect(detail.narrativeSignature?.signatureUrl).toBe('/api/v1/reports/r1/signature/file');
    expect(detail.returnEvent?.comments).toContain('participants');
    expect(detail.history?.[0]?.comment).toContain('participants');
  });

  it('withholds every trace of the narrative from another PIC', async () => {
    const detail = await buildReportDetail(env, row, options(true));

    expect(detail.narrativePrivate).toBe(true);
    expect(detail.form.narrative).toBe('');
    expect(detail.attachments).toEqual([]);
    expect(detail.narrativeSignature).toBeUndefined();
    expect(detail.returnEvent).toBeUndefined();
    expect(detail.history?.[0]?.comment).toBeUndefined();
    // The activity itself stays readable: the caller still sees what happened.
    expect(detail.form.title).toBe('Coastal cleanup');
    expect(detail.pics.map((entry) => entry.name)).toEqual(['M. Santos']);
  });
});

describe('date completed', () => {
  it("hands the office the record's completion date and the right to set it", async () => {
    const approved: ReportRow = {
      ...row,
      status: 'APPROVED',
      approvedAt: '2026-03-20T02:00:00.000Z',
      completedOn: '2026-03-18',
    };
    const detail = await buildReportDetail(env, approved, {
      ...options(false),
      canSetCompletedDate: true,
    });

    expect(detail.completedOn).toBe('2026-03-18');
    expect(detail.canSetCompletedDate).toBe(true);
    // The decision timestamp is untouched by the sheet date.
    expect(detail.approvedAt).toBe('2026-03-20T02:00:00.000Z');
  });

  it('omits the field while the office has not set one', async () => {
    const detail = await buildReportDetail(env, row, options(false));

    expect(detail.completedOn).toBeUndefined();
  });
});
