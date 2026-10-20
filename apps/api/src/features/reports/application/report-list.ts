import type { ReportListFilter } from '@par/db';
import type { ReportListQuery } from '@par/shared';

import type { Viewer } from '../domain/report-access';

/**
 * My reports is always the caller's own list, whatever their role (UI spec
 * §7.4). Seeing everyone's reports is the queues' and Search's job, not this
 * page's. A term has already been resolved to its date window.
 */
export function reportListFilter(
  viewer: Viewer,
  query: ReportListQuery,
  window: { from?: string | undefined; to?: string | undefined },
): ReportListFilter {
  return {
    ...query,
    ownerUserId: viewer.userId,
    ...(window.from ? { from: window.from } : {}),
    ...(window.to ? { to: window.to } : {}),
  };
}
