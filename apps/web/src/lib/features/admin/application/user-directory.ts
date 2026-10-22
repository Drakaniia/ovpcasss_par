import type {
  AdminUser,
  AdminUserDirection,
  AdminUserListQuery,
  AdminUserSort,
  Role,
  UserStatus,
} from '@par/shared';
import { ROLES, USER_STATUSES } from '@par/shared';

/**
 * Administrative user directory rules (UI spec §7.15, phase 03). Everything the
 * table, drawer, and confirmations decide lives here so the components stay
 * presentational and the rules stay testable.
 */

/** Role names use the project vocabulary; the avatar menu abbreviates Admin differently. */
export const USER_ROLE_LABELS: Record<Role, string> = {
  SUBMITTER: 'Submitter',
  REVIEWER: 'Reviewer',
  APPROVER: 'Approver',
  ADMIN: 'Admin',
};

export type UserStatusTone = 'info' | 'gold' | 'success' | 'neutral';
export type UserStatusIcon = 'mail' | 'check' | 'ban';

export const USER_STATUS_PRESENTATION: Record<
  UserStatus,
  { label: string; tone: UserStatusTone; icon: UserStatusIcon }
> = {
  PENDING_VERIFICATION: { label: 'Pending verification', tone: 'info', icon: 'mail' },
  ACTIVE: { label: 'Active', tone: 'success', icon: 'check' },
  DISABLED: { label: 'Disabled', tone: 'neutral', icon: 'ban' },
};

export const USER_STATUSES_ALL = USER_STATUSES;
export const USER_ROLES_ALL = ROLES;

export const PAGE_SIZES = [25, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

export type UserFilters = {
  q: string;
  role: Role | 'ALL';
  status: UserStatus | 'ALL';
  sort: AdminUserSort;
  dir: AdminUserDirection;
  page: number;
  pageSize: PageSize;
};

export const DEFAULT_USER_FILTERS: UserFilters = {
  q: '',
  role: 'ALL',
  status: 'ALL',
  sort: 'registered',
  dir: 'asc',
  page: 1,
  pageSize: 25,
};

function isRole(value: string | null): value is Role {
  return value !== null && (ROLES as readonly string[]).includes(value);
}

function isStatus(value: string | null): value is UserStatus {
  return value !== null && (USER_STATUSES as readonly string[]).includes(value);
}

function positiveInt(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/** Reads URL state; a shared link reproduces exactly what the sender saw. */
export function filtersFromParams(params: URLSearchParams): UserFilters {
  const status = params.get('status');
  const role = params.get('role');
  const sort = params.get('sort');
  const dir = params.get('dir');
  const pageSize = Number(params.get('pageSize'));

  return {
    q: params.get('q')?.trim() ?? '',
    role: isRole(role) ? role : 'ALL',
    status: status === 'ALL' ? 'ALL' : isStatus(status) ? status : DEFAULT_USER_FILTERS.status,
    sort: sort === 'name' || sort === 'registered' ? sort : DEFAULT_USER_FILTERS.sort,
    dir: dir === 'desc' ? 'desc' : 'asc',
    page: positiveInt(params.get('page'), 1),
    pageSize: (PAGE_SIZES as readonly number[]).includes(pageSize)
      ? (pageSize as PageSize)
      : DEFAULT_USER_FILTERS.pageSize,
  };
}

/** Round-trips through `filtersFromParams`; defaults that carry meaning stay explicit. */
export function filtersToParams(filters: UserFilters): string {
  const params = new URLSearchParams();
  params.set('status', filters.status);

  if (filters.q) params.set('q', filters.q);
  if (filters.role !== 'ALL') params.set('role', filters.role);
  if (filters.sort !== DEFAULT_USER_FILTERS.sort) params.set('sort', filters.sort);
  if (filters.dir !== DEFAULT_USER_FILTERS.dir) params.set('dir', filters.dir);
  if (filters.page > 1) params.set('page', String(filters.page));
  if (filters.pageSize !== DEFAULT_USER_FILTERS.pageSize) {
    params.set('pageSize', String(filters.pageSize));
  }

  return params.toString();
}

export function filtersToQuery(filters: UserFilters): AdminUserListQuery {
  return {
    q: filters.q || undefined,
    role: filters.role === 'ALL' ? undefined : filters.role,
    status: filters.status === 'ALL' ? undefined : filters.status,
    sort: filters.sort,
    dir: filters.dir,
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

export function filtersEqual(a: UserFilters, b: UserFilters): boolean {
  return (
    a.q === b.q &&
    a.role === b.role &&
    a.status === b.status &&
    a.sort === b.sort &&
    a.dir === b.dir &&
    a.page === b.page &&
    a.pageSize === b.pageSize
  );
}

/** Filter changes restart at page 1 unless the patch names a page itself. */
export function updateFilters(current: UserFilters, patch: Partial<UserFilters>): UserFilters {
  const next = { ...current, ...patch };
  const rescopes = 'q' in patch || 'role' in patch || 'status' in patch || 'pageSize' in patch;
  if (rescopes && patch.page === undefined) next.page = 1;
  return next;
}

export function hasActiveFilters(filters: UserFilters): boolean {
  return filters.q !== '' || filters.role !== 'ALL' || filters.status !== 'ALL';
}

export function clearedFilters(filters: UserFilters): UserFilters {
  return { ...DEFAULT_USER_FILTERS, status: 'ALL', pageSize: filters.pageSize };
}

export function pageCountFor(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

export function showingRange(
  page: number,
  pageSize: number,
  total: number,
): { from: number; to: number } {
  if (total === 0) return { from: 0, to: 0 };
  const from = (page - 1) * pageSize + 1;
  return { from, to: Math.min(page * pageSize, total) };
}

/** Page buttons with `null` standing in for an ellipsis (phase 03 layout). */
export function pageWindow(page: number, count: number): Array<number | null> {
  if (count <= 7) return Array.from({ length: count }, (_, index) => index + 1);

  const start = Math.max(2, Math.min(page - 1, count - 4));
  const end = Math.min(count - 1, Math.max(page + 1, 5));
  const pages: Array<number | null> = [1];

  if (start > 2) pages.push(null);
  for (let current = start; current <= end; current += 1) pages.push(current);
  if (end < count - 1) pages.push(null);
  pages.push(count);

  return pages;
}

export type UserActionKind = 'assign-role' | 'activate' | 'disable';

export type UserActionState = {
  visible: boolean;
  enabled: boolean;
  /** Disabled controls always carry an adjacent reason (foundation §4.2). */
  reason?: string;
};

/**
 * Which drawer actions apply to this account (phase 03 §3). Every account has a
 * role, so Activate is only ever the disabled-to-active switch; it is hidden for
 * the signed-in admin because it is meaningless for an active account.
 */
export function userActionStates(
  user: AdminUser,
  isSelf: boolean,
): Record<UserActionKind, UserActionState> {
  const activates = user.status === 'DISABLED';

  return {
    'assign-role': {
      visible: true,
      enabled: !isSelf,
      reason: isSelf ? 'You cannot change your own role.' : undefined,
    },
    activate: !isSelf && activates ? { visible: true, enabled: true } : { visible: false, enabled: false },
    disable:
      user.status === 'ACTIVE'
        ? isSelf
          ? { visible: true, enabled: false, reason: 'You cannot disable your own account.' }
          : { visible: true, enabled: true }
        : { visible: false, enabled: false },
  };
}

export type ConfirmationCopy = {
  title: string;
  description: string;
  confirmLabel: string;
};

export function assignRoleConfirmation(user: AdminUser, role: Role): ConfirmationCopy {
  return {
    title: `Assign the ${USER_ROLE_LABELS[role]} role to ${user.fullName}?`,
    description: 'The new role applies the next time they sign in or refresh.',
    confirmLabel: 'Assign role',
  };
}

export function activateConfirmation(user: AdminUser): ConfirmationCopy {
  return {
    title: `Activate ${user.fullName}?`,
    description: `${user.fullName} can sign in after activation.`,
    confirmLabel: 'Activate account',
  };
}

export function disableConfirmation(user: AdminUser): ConfirmationCopy {
  return {
    title: `Disable ${user.fullName}?`,
    description: `${user.fullName} will no longer be able to sign in. Their reports and audit history are kept.`,
    confirmLabel: 'Disable account',
  };
}
