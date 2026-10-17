import type { MonitoringSheetRow } from './row';

/**
 * Builds one monitoring sheet as an `.xlsx` byte array (spec §7.13).
 * Implemented in M6 after the writer library is verified in Workers.
 */
export async function buildMonitoringWorkbook(
  _rows: readonly MonitoringSheetRow[],
  _title: string,
): Promise<Uint8Array> {
  throw new Error('buildMonitoringWorkbook is not implemented yet (M6)');
}
