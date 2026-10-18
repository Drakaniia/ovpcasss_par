import type {
  ReportDetail,
  ReportFormInput,
  ReportHead,
  ReportStatus,
  ReportValidationResponse,
} from '@par/shared';

import { goto } from '$app/navigation';

import { api } from '$lib/api/client';
import { destinationAfterSignIn } from '$lib/features/auth/application/post-sign-in';
import { clearSession, loadSession } from '$lib/session/session.svelte';

import type { EditReferences } from './report-field-values';

/**
 * The editor is reachable only by a signed-in, active account. A closed session
 * goes to sign-in, a pending or suspended one to its holding page.
 */
export async function ensureActiveSession(): Promise<'ok' | 'redirected' | 'error'> {
  try {
    const account = await loadSession();
    if (!account) {
      await goto('/login', { replaceState: true });
      return 'redirected';
    }

    if (account.status === 'ACTIVE') return 'ok';

    const destination = destinationAfterSignIn(account);
    if (destination) {
      await goto(destination, { replaceState: true });
    } else {
      clearSession();
      await goto('/login', { replaceState: true });
    }
    return 'redirected';
  } catch {
    return 'error';
  }
}

/** One round trip for everything the editor needs to render. */
export async function fetchReportBundle(
  id: string,
): Promise<{ detail: ReportDetail; references: EditReferences }> {
  const [detail, campuses, units, departments, offices, sdgs, requirements] = await Promise.all([
    api.reports.get(id),
    api.reference.list('campuses'),
    api.reference.list('units'),
    api.reference.list('departments'),
    api.reference.list('offices'),
    api.reference.list('sdgs'),
    api.reference.list('attachment-requirements'),
  ]);

  return {
    detail,
    references: {
      campuses: campuses.items,
      units: units.items,
      departments: departments.items,
      offices: offices.items,
      sdgs: sdgs.items,
      requirements: requirements.items,
    },
  };
}

export function fetchServerCopy(id: string): Promise<ReportDetail> {
  return api.reports.get(id);
}

export function saveReport(
  id: string,
  input: ReportFormInput,
  version: number,
): Promise<ReportHead> {
  return api.reports.update(id, input, version);
}

export function validateReport(id: string): Promise<ReportValidationResponse> {
  return api.reports.validate(id);
}

export function resubmitReport(
  id: string,
  key: string,
  version: number,
): Promise<{ status: ReportStatus }> {
  return api.reports.resubmit(id, key, version);
}

/** One key per attempt; retrying the same intent stays idempotent (spec §7.5). */
export function resubmitKey(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `resubmit-${Date.now()}`;
}
