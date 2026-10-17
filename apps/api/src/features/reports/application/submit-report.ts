export interface SubmitReportCommand {
  reportId: string;
  actorId: string;
  idempotencyKey: string;
}

/**
 * Validates completeness, issues the tracking number, and moves the report to
 * SUBMITTED in one batch (spec §7.5-§7.7). Implemented in M3.
 */
export async function submitReport(command: SubmitReportCommand): Promise<void> {
  throw new Error(`submitReport is not implemented yet (report ${command.reportId})`);
}
