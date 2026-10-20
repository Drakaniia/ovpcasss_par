import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$lib/api/client', () => ({
  api: {
    reports: { create: vi.fn(), get: vi.fn(), update: vi.fn(), validate: vi.fn(), submit: vi.fn() },
  },
}));

import type { Attachment, ReportDetail, ReportFormInput } from '@par/shared';

import { api } from '$lib/api/client';
import { ApiError } from '$lib/api/http';

import { WizardDraftFile } from './wizard-draft-file.svelte';
import { emptyWizardForm } from './wizard-form';
import { submitNewReport } from './wizard-requests';

const input: ReportFormInput = {
  type: 'OFF_CAMPUS',
  classification: 'CURRICULAR',
  campusId: 'c1',
  unitId: 'u1',
  level: 'UNDERGRADUATE',
  title: 'Coastal cleanup',
  activityStartDate: '2026-03-12',
  activityEndDate: '2026-03-13',
  location: 'Brgy. Poblacion',
  totalStudents: 42,
  totalPic: 1,
  pics: [{ name: 'A. Cruz' }],
  sdgIds: ['s1'],
  narrative: 'The activity gathered students for a coastal cleanup.',
};

const options = { reportId: 'r1', input, idempotencyKey: 'key-1' };

beforeEach(() => {
  vi.mocked(api.reports.update).mockResolvedValue({} as never);
  vi.mocked(api.reports.validate).mockReset();
  vi.mocked(api.reports.submit).mockReset();
});

describe('submitNewReport', () => {
  it('submits once the server validation passes', async () => {
    vi.mocked(api.reports.validate).mockResolvedValue({ valid: true, issues: [] });
    vi.mocked(api.reports.submit).mockResolvedValue({
      id: 'r1',
      status: 'SUBMITTED',
      trackingNumber: 'OFF-2026-0015',
    } as never);

    const outcome = await submitNewReport(options);

    expect(outcome).toEqual({
      kind: 'submitted',
      result: { id: 'r1', status: 'SUBMITTED', trackingNumber: 'OFF-2026-0015' },
    });
    expect(api.reports.submit).toHaveBeenCalledWith('r1', 'key-1');
  });

  it('renders the server field list instead of submitting', async () => {
    vi.mocked(api.reports.validate).mockResolvedValue({
      valid: false,
      issues: [{ field: 'narrative', step: 4, message: 'Narrative is too short.' }],
    });

    const outcome = await submitNewReport(options);

    expect(outcome).toEqual({
      kind: 'invalid',
      issues: [{ field: 'narrative', step: 4, message: 'Narrative is too short.' }],
    });
    expect(api.reports.submit).not.toHaveBeenCalled();
  });

  it('reports a 409 as a conflict for the phase 07 dialog', async () => {
    vi.mocked(api.reports.validate).mockResolvedValue({ valid: true, issues: [] });
    vi.mocked(api.reports.submit).mockRejectedValue(
      new ApiError(409, 'CONFLICT', 'The report changed on the server.'),
    );

    expect(await submitNewReport(options)).toEqual({ kind: 'conflict' });
  });

  it('keeps the request id on any other failure', async () => {
    vi.mocked(api.reports.validate).mockRejectedValue(
      new ApiError(503, 'UNAVAILABLE', 'Try again later.', 'req-9'),
    );

    expect(await submitNewReport(options)).toEqual({
      kind: 'error',
      message: 'Try again later.',
      requestId: 'req-9',
    });
  });
});

describe('continuing a server draft (spec §7.4)', () => {
  const attachment = (overrides: Partial<Attachment> = {}): Attachment => ({
    id: 'a1',
    reportId: 'r1',
    label: 'Attendance sheet',
    originalName: 'attendance.pdf',
    size: 1024,
    mimeType: 'application/pdf',
    status: 'CONFIRMED',
    ...overrides,
  });

  const serverDraft = (): ReportDetail => ({
    id: 'r1',
    ownerUserId: 'u1',
    trackingNumber: null,
    status: 'DRAFT',
    version: 3,
    updatedAt: '2026-03-12T02:00:00.000Z',
    form: input,
    attachments: [attachment(), attachment({ id: 'a2', status: 'DELETED' })],
  });

  it('adopts the server copy and its live attachments', () => {
    const draft = new WizardDraftFile('r1');
    const adopted = draft.adopt(serverDraft());

    expect(adopted.form.title).toBe('Coastal cleanup');
    expect(adopted.attachments.map((item) => item.fileName)).toEqual(['attendance.pdf']);
    expect(draft.serverId).toBe('r1');
    expect(draft.version).toBe(3);
    expect(draft.state).toEqual({ status: 'saved', savedAt: '2026-03-12T02:00:00.000Z' });
  });

  it('continues that report instead of creating a second draft', async () => {
    const draft = new WizardDraftFile('r1');
    draft.adopt(serverDraft());

    const reportId = await draft.ensureServer(null, { step: 2, form: emptyWizardForm() }, input);

    expect(reportId).toBe('r1');
    expect(api.reports.create).not.toHaveBeenCalled();
  });
});
