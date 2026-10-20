import type { AuditQueries, EmailOutboxQueries, UserQueries, UserRow } from '@par/db';
import type { InboxAdmin, InboxResponse, InboxSection, Role } from '@par/shared';

import { summarizeAuditEvent } from '../domain/audit-summary';
import { isProfileComplete } from '../domain/onboarding';

/**
 * Work-inbox assembly (UI spec §7.3, phase 02). Reports are M3, so every report
 * section is empty and no section is derived from data that does not exist yet;
 * the shape and the server-owned onboarding state are what M1 owes the client.
 */
export interface InboxQueries {
  users: UserQueries;
  emailOutbox: EmailOutboxQueries;
  audit: AuditQueries;
}

const EMPTY_SECTION: InboxSection = { total: 0, items: [] };

export async function buildInbox(
  queries: InboxQueries,
  user: UserRow,
  role: Role | undefined,
): Promise<InboxResponse> {
  return {
    returned: EMPTY_SECTION,
    review: EMPTY_SECTION,
    approval: EMPTY_SECTION,
    drafts: EMPTY_SECTION,
    waiting: EMPTY_SECTION,
    activity: [],
    admin: role === 'ADMIN' ? await buildAdmin(queries) : null,
    onboarding: {
      profileComplete: isProfileComplete(user),
      hasSubmitted: false,
      draftId: null,
    },
  };
}

/** The admin block; an Admin also acts as a submitter, reviewer, and approver. */
async function buildAdmin(queries: InboxQueries): Promise<InboxAdmin> {
  const [pendingRoleApprovals, failedEmails, recent] = await Promise.all([
    queries.users.countByStatus('PENDING_ROLE'),
    queries.emailOutbox.countFailed(),
    queries.audit.listRecent(3),
  ]);

  return {
    pendingRoleApprovals,
    failedEmails,
    auditEvents: recent.map((row) => ({
      id: row.id,
      summary: summarizeAuditEvent(row),
      occurredAt: row.createdAt,
    })),
  };
}
