import type { ReportDetail, ReportPerson, Role } from '@par/shared';

import { ROLE_LABELS } from '$lib/navigation/navigation';

/**
 * Who holds the report (UI spec §7.7): the submitter plus whoever reviewed or
 * approved it. Roles that have not acted are omitted, and the audit timeline is
 * the fallback when the detail endpoint does not name people directly.
 */

export type PersonRow = {
  role: Role;
  name: string;
  roleLabel: string;
  actedAt?: string;
};

const PERSON_ROLES: readonly Role[] = ['SUBMITTER', 'REVIEWER', 'APPROVER'];

function knownPeople(detail: ReportDetail): Map<Role, ReportPerson> {
  const people = new Map<Role, ReportPerson>();
  if (detail.people?.submitter) people.set('SUBMITTER', detail.people.submitter);
  if (detail.people?.reviewer) people.set('REVIEWER', detail.people.reviewer);
  if (detail.people?.approver) people.set('APPROVER', detail.people.approver);

  // Newest first, so the first match per role is the person who last acted.
  const events = [...(detail.history ?? [])].sort((a, b) => b.at.localeCompare(a.at));
  for (const role of PERSON_ROLES) {
    if (people.has(role)) continue;
    const event = events.find((entry) => entry.actorRole === role);
    if (event) {
      people.set(role, { fullName: event.actorName, role: event.actorRole, actedAt: event.at });
    }
  }

  return people;
}

export function personRows(detail: ReportDetail): PersonRow[] {
  const people = knownPeople(detail);

  return PERSON_ROLES.flatMap((role) => {
    const person = people.get(role);
    if (!person) return [];
    return [
      {
        role,
        name: person.fullName,
        roleLabel: ROLE_LABELS[role],
        ...(person.actedAt ? { actedAt: person.actedAt } : {}),
      },
    ];
  });
}

export type SignatureBlock = {
  submittedBy: string;
  submittedAt?: string;
  /** The submitter's snapshotted image; absent on an unsigned report. */
  submitterSignatureUrl?: string;
  /** Only set on an approved report; a returned report keeps the block blank. */
  approvedBy?: string;
  approvedAt?: string;
  signatureUrl?: string;
};

export function signatureBlock(detail: ReportDetail): SignatureBlock {
  const people = knownPeople(detail);
  const submitter = people.get('SUBMITTER')?.fullName;
  const approval = detail.status === 'APPROVED' ? detail.approval : null;

  return {
    submittedBy: submitter ?? '—',
    ...(detail.submittedAt ? { submittedAt: detail.submittedAt } : {}),
    ...(detail.submitterSignature?.signatureUrl
      ? { submitterSignatureUrl: detail.submitterSignature.signatureUrl }
      : {}),
    ...(approval
      ? {
          approvedBy: approval.signerName,
          approvedAt: approval.signedAt,
          ...(approval.signatureUrl ? { signatureUrl: approval.signatureUrl } : {}),
        }
      : {}),
  };
}
