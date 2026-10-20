import type { UserListFilter, UserQueries } from '@par/db';
import { adminUserListQuerySchema, type AdminUserListResponse } from '@par/shared';

import { toAdminUser } from '../../../lib/user-view';

const DEFAULT_SORT = 'registered';
const DEFAULT_DIRECTION = 'desc';
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

export type ParsedUserListQuery =
  | { ok: true; filter: UserListFilter }
  | { ok: false; issues: unknown[] };

/**
 * The query arrives as strings, but the shared schema types `page` and
 * `pageSize` as numbers, so they are converted here before validation. A missing
 * value falls back to the directory defaults.
 */
export function parseUserListQuery(raw: Record<string, string>): ParsedUserListQuery {
  const result = adminUserListQuerySchema.safeParse({
    q: raw.q,
    role: raw.role,
    status: raw.status,
    sort: raw.sort,
    dir: raw.dir,
    page: raw.page ? Number(raw.page) : undefined,
    pageSize: raw.pageSize ? Number(raw.pageSize) : undefined,
  });

  if (!result.success) return { ok: false, issues: result.error.issues };

  const { q, role, status, sort, dir, page, pageSize } = result.data;

  return {
    ok: true,
    filter: {
      ...(q === undefined ? {} : { q }),
      ...(role === undefined ? {} : { role }),
      ...(status === undefined ? {} : { status }),
      sort: sort ?? DEFAULT_SORT,
      dir: dir ?? DEFAULT_DIRECTION,
      page: page ?? DEFAULT_PAGE,
      pageSize: pageSize ?? DEFAULT_PAGE_SIZE,
    },
  };
}

export async function listAdminUsers(
  queries: UserQueries,
  filter: UserListFilter,
): Promise<AdminUserListResponse> {
  const [page, pendingRoleCount] = await Promise.all([
    queries.list(filter),
    queries.countByStatus('PENDING_ROLE'),
  ]);

  return {
    items: page.rows.map(toAdminUser),
    total: page.total,
    page: filter.page,
    pageSize: filter.pageSize,
    pendingRoleCount,
  };
}
