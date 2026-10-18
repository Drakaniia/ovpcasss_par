import type { ReportDetail } from '@par/shared';
import { describe, expect, it } from 'vitest';

import {
  conflictFields,
  conflictTitle,
  localEditsText,
  serverVersionLine,
} from './report-conflict';
import { emptyReferences } from './report-field-values';
import { formFromDraft } from './wizard-form';

const serverForm = {
  type: 'OFF_CAMPUS' as const,
  classification: 'CURRICULAR' as const,
  campusId: 'c1',
  unitId: 'un1',
  level: 'UNDERGRADUATE' as const,
  title: 'Coastal cleanup',
  activityStartDate: '2026-03-12',
  activityEndDate: '2026-03-13',
  location: 'Brgy. Poblacion',
  totalStudents: 42,
  totalPic: 1,
  pics: [{ name: 'J. Dela Cruz' }],
  sdgIds: ['s1'],
  narrative: 'Server narrative.',
};

const localForm = formFromDraft({
  ...serverForm,
  totalStudents: 40,
  narrative: 'Local narrative.\nSecond paragraph.',
});

const server = (overrides: Partial<ReportDetail> = {}): ReportDetail => ({
  id: 'r1',
  ownerUserId: 'u1',
  trackingNumber: 'OFF-2026-0014',
  status: 'RETURNED_BY_REVIEWER',
  version: 4,
  updatedAt: '2026-03-16T02:40:00.000Z',
  form: serverForm,
  attachments: [],
  updatedByName: 'M. Santos',
  ...overrides,
});

describe('conflict diff', () => {
  it('lists only the differing fields in form order', () => {
    const fields = conflictFields(serverForm, localForm, emptyReferences());

    expect(fields.map((field) => field.key)).toEqual(['totalStudents', 'narrative']);
    expect(fields[0]).toMatchObject({
      label: 'Total number of students',
      serverValue: '42',
      localValue: '40',
    });
    expect(fields[1].localValue).toContain('Local narrative.');
  });

  it('reports no rows when the copies agree', () => {
    expect(conflictFields(serverForm, formFromDraft(serverForm), emptyReferences())).toEqual([]);
  });

  it('uses the single editing-conflict title', () => {
    expect(conflictTitle()).toBe('This report changed while you were editing');
  });

  it('names the newer server version and its author when supplied', () => {
    expect(serverVersionLine(server())).toContain('Server version 4');
    expect(serverVersionLine(server())).toContain('M. Santos');
    expect(serverVersionLine(server({ updatedByName: undefined }))).not.toContain('by');
  });

  it('writes labelled blocks for the clipboard', () => {
    const fields = conflictFields(serverForm, localForm, emptyReferences());
    const text = localEditsText(fields, 'Coastal cleanup');

    expect(text).toContain('Your edits to "Coastal cleanup"');
    expect(text).toContain('Total number of students:\n40');
    expect(text).toContain('Narrative:\nLocal narrative.');
    expect(text).not.toContain('Server narrative.');
  });
});
