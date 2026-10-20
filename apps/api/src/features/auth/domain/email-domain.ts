/**
 * The registration allow-list rule (spec §7.4). Entries may be written with or
 * without a leading `@`, so both sides are normalized before comparing.
 */
function normalizeDomains(domains: readonly string[]): string[] {
  return domains
    .map((domain) => domain.trim().toLowerCase().replace(/^@/, ''))
    .filter((domain) => domain.length > 0);
}

/**
 * True when `email` sits on an allowed domain. An empty list is not a lockout —
 * the office may simply not have configured domains yet, and the registration
 * hint is optional — so it allows every address.
 */
export function isAllowedDomain(email: string, domains: readonly string[]): boolean {
  const allowed = normalizeDomains(domains);
  if (allowed.length === 0) return true;

  const normalized = email.trim().toLowerCase();
  const at = normalized.lastIndexOf('@');
  if (at < 0) return false;

  return allowed.includes(normalized.slice(at + 1));
}
