import type { ReportDetail, ReportStatus } from '@par/shared';

import { formatDateRange } from '$lib/format/datetime';
import { REPORT_TYPE_LABELS } from '$lib/format/report-type';
import { STATUS_PRESENTATION } from '$lib/status/report-status';

/**
 * The preview a personnel in charge sees before opening an activity (report 4).
 * The list row carries only the register's summary; this module shapes the full
 * detail into the facts table and decides the one action the dialog offers.
 */

export type PreviewAction = { label: string; href: string };

const OPEN_STATUSES: readonly ReportStatus[] = ['PENDING', 'RETURNED'];

/** PENDING and RETURNED records are the ones a PIC may write. */
export function previewAction(report: { id: string; status: ReportStatus }): PreviewAction {
  return {
    label: OPEN_STATUSES.includes(report.status) ? 'Create narrative report' : 'View record',
    href: `/reports/${report.id}`,
  };
}

export type NamedReference = { id: string; name: string };
export type SdgReference = { id: string; number: number };

export type PreviewNames = {
  campus: string;
  unit: string;
  sdgs: readonly SdgReference[];
};

export const EMPTY_PREVIEW_NAMES: PreviewNames = { campus: '', unit: '', sdgs: [] };

/** Resolves the ids the record stores against the reference lists it read. */
export function previewNamesFor(
  form: Pick<ReportDetail['form'], 'campusId' | 'unitId'>,
  refs: {
    campuses: readonly NamedReference[];
    units: readonly NamedReference[];
    sdgs: readonly SdgReference[];
  },
): PreviewNames {
  return {
    campus: refs.campuses.find((campus) => campus.id === form.campusId)?.name ?? '',
    unit: refs.units.find((unit) => unit.id === form.unitId)?.name ?? '',
    sdgs: refs.sdgs.map((sdg) => ({ id: sdg.id, number: sdg.number })),
  };
}

export type PreviewFact = { label: string; value: string };
export type PreviewGroup = { title: string; facts: PreviewFact[] };

function text(value: string | undefined): string {
  return value && value.trim() !== '' ? value : '\u2014';
}

function sdgLabels(detail: ReportDetail, names: PreviewNames): string {
  return (
    detail.form.sdgIds
      .map((sdgId) => names.sdgs.find((sdg) => sdg.id === sdgId))
      .filter((sdg): sdg is SdgReference => Boolean(sdg))
      .map((sdg) => `SDG ${sdg.number}`)
      .join(', ') || '\u2014'
  );
}

export function previewGroups(detail: ReportDetail, names: PreviewNames): PreviewGroup[] {
  const form = detail.form;

  return [
    {
      title: 'Activity',
      facts: [
        { label: 'Type', value: REPORT_TYPE_LABELS[form.type] },
        {
          label: 'Classification',
          value: form.classification === 'CURRICULAR' ? 'Curricular' : 'Non-curricular',
        },
        { label: 'Campus', value: text(names.campus) },
        { label: 'College or unit', value: text(names.unit) },
        { label: 'Department', value: text(form.department) },
        { label: 'Office', value: text(form.office) },
        {
          label: 'Level',
          value: form.level === 'GRADUATE' ? 'Graduate' : 'Undergraduate',
        },
        {
          label: 'Date of activity',
          value: formatDateRange(form.activityStartDate, form.activityEndDate),
        },
        { label: 'Location', value: form.location },
        { label: 'Number of activities', value: String(form.activityCount) },
        { label: 'Total students', value: String(form.totalStudents) },
        {
          label: 'Personnel in charge',
          value: form.pics.length > 0 ? form.pics.map((pic) => pic.name).join(', ') : '\u2014',
        },
        { label: 'SDGs', value: sdgLabels(detail, names) },
      ],
    },
    {
      title: 'Record',
      facts: [
        { label: 'AR No.', value: detail.referenceNo },
        { label: 'Status', value: STATUS_PRESENTATION[detail.status].label },
        {
          label: 'Submitted by',
          value: detail.submittedByName ? detail.submittedByName : 'Not submitted yet',
        },
      ],
    },
  ];
}
