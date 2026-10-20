import type { Account, Role, UserStatus } from '@par/shared';

import { api } from '$lib/api/client';
import { ApiError } from '$lib/api/http';
import { forgetSessionToken, restoreSessionToken } from '$lib/platform/session-token';

/**
 * Signed-in user. Phase 01 loads it from `GET /me`; the shell and pages only
 * read it. `role` is null until an administrator assigns one (PENDING_ROLE).
 */
export type SessionUser = {
  id: string;
  fullName: string;
  email: string;
  role: Role | null;
  status: UserStatus;
  campusUnit: string | null;
  contactNumber: string | null;
  unreadNotifications?: number;
  /** Approver signature on file; the approval drawer gates on this (phase 09). */
  hasSignature?: boolean;
};

export const session = $state<{ user: SessionUser | null }>({ user: null });

let loaded = false;
let inflight: Promise<SessionUser | null> | null = null;

function isSignedOut(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

function toSessionUser(account: Account): SessionUser {
  return {
    id: account.id,
    fullName: account.fullName,
    email: account.email,
    role: account.role,
    status: account.status,
    campusUnit: account.campusUnit ?? null,
    contactNumber: account.contactNumber ?? null,
    unreadNotifications: account.unreadNotifications,
    hasSignature: account.hasSignature,
  };
}

export function setSessionUser(account: Account): SessionUser {
  session.user = toSessionUser(account);
  loaded = true;
  return session.user;
}

export function clearSession(): void {
  session.user = null;
  loaded = true;
}

/**
 * Resolve the current account once per page load. A 401/403 means "signed out"
 * rather than an error; a network or server failure is thrown so pages can show
 * the standard error state with Retry.
 */
export async function loadSession(force = false): Promise<SessionUser | null> {
  if (loaded && !force) return session.user;
  if (inflight) return inflight;

  // Desktop reads its credential-store token before the first authenticated call.
  await restoreSessionToken();

  inflight = api.profile
    .get()
    .then((account) => setSessionUser(account))
    .catch((error: unknown) => {
      if (isSignedOut(error)) {
        session.user = null;
        loaded = true;
        return null;
      }
      throw error;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

/** Clears the local session even when the API cannot be reached. */
export async function signOut(): Promise<void> {
  try {
    await api.auth.logout();
  } catch {
    // The session is cleared server-side when possible; local state clears anyway.
  }
  await forgetSessionToken();
  clearSession();
}

/**
 * Moves the bell's number without reloading the account (phase 11 §3). Every
 * read response carries the server's count, so the badge reconciles instead of
 * guessing.
 */
export function setUnreadNotifications(unreadCount: number): void {
  if (!session.user) return;
  session.user.unreadNotifications = unreadCount;
}

export function initialsFor(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}
