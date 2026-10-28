import type { ReportDeleteResponse } from '@par/shared';

/**
 * The office is told the number that went and where the register now ends
 * (2026-10-27): a filed deletion closes its gap, so later records move down one
 * and the next record takes the freed number.
 */
export function deletionMessage(result: ReportDeleteResponse): string {
  if (result.renumbered === 0) {
    return `${result.referenceNo} deleted. The next record will be ${result.nextReferenceNo}.`;
  }

  const moved = result.renumbered === 1 ? 'record moved' : 'records moved';
  return `${result.referenceNo} deleted. ${result.renumbered} ${moved} down one; the next record will be ${result.nextReferenceNo}.`;
}
