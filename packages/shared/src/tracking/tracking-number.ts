import { REPORT_TYPE_PREFIX, type ReportType } from '../domain/enums';

const FIRST_VALID_YEAR = 2000;

/** Formats `<PREFIX>-<YEAR>-<SEQ>` with at least four sequence digits (spec §7.7). */
export function formatTrackingNumber(type: ReportType, year: number, sequence: number): string {
  if (!Number.isInteger(year) || year < FIRST_VALID_YEAR) {
    throw new RangeError(`Invalid tracking year: ${year}`);
  }
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new RangeError(`Invalid tracking sequence: ${sequence}`);
  }

  return `${REPORT_TYPE_PREFIX[type]}-${year}-${String(sequence).padStart(4, '0')}`;
}
