import type { Role } from '@par/shared';

/**
 * The screens a personnel in charge account uses on a phone (2026-11-01).
 *
 * Every other route keeps the foundation notice below 1024 px, because its
 * layout is a desktop one. A route joins this list only when every part of it
 * reflows: the shell chrome, the page padding, and each panel on the screen.
 *
 * Home is the exception the role decides: for a personnel account it is the
 * register of records that name them, but for the office it is the work inbox,
 * which stays a desktop surface. `/reports` itself is absent too: that table is
 * the office's work surface, and no personnel account reaches it.
 */
export function mobileShell(pathname: string, role?: Role | null): boolean {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;

  // The account has not resolved yet; assume the personnel read it as a PIC.
  if (path === '/') return role !== 'ADMIN';

  return /^\/reports\/[^/]+$/.test(path) || /^\/reports\/[^/]+\/edit$/.test(path);
}
