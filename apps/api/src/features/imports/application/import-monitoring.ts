import type { MonitoringQueries } from '@par/db';
import type { ParsedMonitoringSheet } from '@par/export';
import type { MonitoringImportResponse, MonitoringImportRowResult } from '@par/shared';

import { createId } from '../../../lib/ids';
import {
  planImportRows,
  trackingParts,
  type ImportReferences,
  type PlannedReportValues,
} from '../domain/import-plan';

export interface ImportMonitoringInput {
  sheets: readonly ParsedMonitoringSheet[];
  references: ImportReferences;
  /** The admin who uploaded the workbook; imported rows are owned by them. */
  actorUserId: string;
  now?: string;
}

/**
 * Applies a filled workbook. New tracking numbers create reports; existing ones
 * update the monitoring fields and keep their owner, narrative, and history.
 *
 * Rows are validated before any write, so an invalid row cannot leave a half
 * report behind. The writes themselves are sequential: a D1 request has a
 * statement budget, and a workbook is capped below it at the route.
 */
export async function importMonitoring(
  queries: MonitoringQueries,
  input: ImportMonitoringInput,
): Promise<MonitoringImportResponse> {
  const now = input.now ?? new Date().toISOString();
  const rows = input.sheets.flatMap((sheet) => sheet.rows);
  const skipped = input.sheets.reduce((total, sheet) => total + sheet.blankRows, 0);
  const plan = planImportRows(rows, input.references);

  const existing = await queries.findByTrackingNumbers(
    plan.flatMap((item) => (item.values ? [item.values.trackingNumber] : [])),
  );

  const results: MonitoringImportRowResult[] = [];
  const counters = new Map<string, { prefix: string; year: number; seq: number }>();

  let created = 0;
  let updated = 0;
  let failed = 0;

  for (const item of plan) {
    const result = {
      sheetName: item.source.sheetName,
      rowNumber: item.source.rowNumber,
      trackingNumber: item.source.trackingNumber,
      title: item.source.title,
    };

    if (!item.values) {
      failed += 1;
      results.push({ ...result, action: 'failed', issues: item.issues });
      continue;
    }

    const values = item.values;
    const current = existing.get(values.trackingNumber);

    try {
      if (current) {
        await queries.updateImportedReport(
          current.id,
          updateValues(values, current.status, current.approvedAt, current.version, now),
          values.sdgIds,
          pictures(values),
        );
        updated += 1;
      } else {
        await queries.insertImportedReport(
          {
            ...insertValues(values, input.actorUserId, now),
            id: createId(),
          },
          values.sdgIds,
          pictures(values),
        );
        created += 1;
      }

      results.push({ ...result, action: current ? 'updated' : 'created', issues: [] });

      const parts = trackingParts(values.trackingNumber);
      if (parts) {
        const key = `${parts.prefix}-${parts.year}`;
        const previous = counters.get(key);
        counters.set(key, {
          prefix: parts.prefix,
          year: parts.year,
          seq: Math.max(previous?.seq ?? 0, parts.seq),
        });
      }
    } catch {
      failed += 1;
      results.push({ ...result, action: 'failed', issues: ['This row could not be saved.'] });
    }
  }

  for (const counter of counters.values()) {
    await queries.raiseTrackingCounter(counter.prefix, counter.year, counter.seq);
  }

  return { created, updated, failed, skipped, rows: results, importedAt: now };
}

function insertValues(values: PlannedReportValues, actorUserId: string, now: string) {
  return {
    type: values.type,
    trackingNumber: values.trackingNumber,
    status: values.status,
    version: 0,
    ownerUserId: actorUserId,
    classification: values.classification,
    campusId: values.campusId,
    unitId: values.unitId,
    department: values.department,
    office: values.office,
    level: values.level,
    title: values.title,
    activityStartDate: values.activityStartDate,
    activityEndDate: values.activityStartDate,
    location: values.location,
    totalStudents: values.totalStudents,
    totalPic: values.totalPic,
    narrative: '',
    submittedAt: values.submittedAt,
    endorsedAt: null,
    approvedAt: values.approvedAt,
    approvedByUserId: null,
    createdAt: now,
    updatedAt: now,
  };
}

/** A blank Date Completed never downgrades a report that was already approved. */
function updateValues(
  values: PlannedReportValues,
  currentStatus: string,
  currentApprovedAt: string | null,
  version: number,
  now: string,
) {
  const keepApproved = currentStatus === 'APPROVED' && !values.approvedAt;

  return {
    type: values.type,
    status: values.approvedAt
      ? ('APPROVED' as const)
      : keepApproved
        ? ('APPROVED' as const)
        : ('SUBMITTED' as const),
    classification: values.classification,
    campusId: values.campusId,
    unitId: values.unitId,
    department: values.department,
    office: values.office,
    level: values.level,
    title: values.title,
    activityStartDate: values.activityStartDate,
    activityEndDate: values.activityStartDate,
    location: values.location,
    totalStudents: values.totalStudents,
    totalPic: values.totalPic,
    submittedAt: values.submittedAt,
    approvedAt: values.approvedAt ?? currentApprovedAt,
    version: version + 1,
    updatedAt: now,
  };
}

function pictures(values: PlannedReportValues) {
  return values.pic
    ? [
        {
          id: createId(),
          name: values.pic.name,
          email: values.pic.email,
          phone: values.pic.phone,
          sortOrder: 0,
        },
      ]
    : [];
}
