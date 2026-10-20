import { actsAs } from '@par/shared';
import type {
  AttachmentRequirement,
  Campus,
  Department,
  Office,
  ReportFormInput,
  ReportValidationIssue,
  Sdg,
  SubmitReportResponse,
  Unit,
} from '@par/shared';
import { goto } from '$app/navigation';

import { api } from '$lib/api/client';
import { ApiError } from '$lib/api/http';
import { destinationAfterSignIn } from '$lib/features/auth/application/post-sign-in';
import { clearSession, loadSession } from '$lib/session/session.svelte';

/**
 * The wizard's server calls (UI phase 06 §1, §4): the account gate, the form's
 * reference data, and the submit pipeline. Keeping them here leaves the wizard
 * component a view and the controller free of request shapes.
 */

export type WizardAuth = 'loading' | 'ready' | 'denied' | 'error';

export type WizardReferenceData = {
  campuses: Campus[];
  units: Unit[];
  departments: Department[];
  offices: Office[];
  sdgs: Sdg[];
  requirements: AttachmentRequirement[];
};

export function emptyWizardReferences(): WizardReferenceData {
  return { campuses: [], units: [], departments: [], offices: [], sdgs: [], requirements: [] };
}

/**
 * Resolves the account. Redirects win over a role decision, so the caller only
 * renders the form when this returns `ready`.
 */
export async function resolveWizardAccount(): Promise<WizardAuth> {
  try {
    const account = await loadSession();
    if (!account) {
      await goto('/login', { replace: true });
      return 'loading';
    }

    if (account.status !== 'ACTIVE') {
      const destination = destinationAfterSignIn(account);
      if (destination) {
        await goto(destination, { replace: true });
        return 'loading';
      }
      clearSession();
      await goto('/login', { replace: true });
      return 'loading';
    }

    return actsAs(account.role, 'SUBMITTER') ? 'ready' : 'denied';
  } catch {
    return 'error';
  }
}

export type ReferenceResult = { references: WizardReferenceData } | { requestId?: string };

export async function loadWizardReferences(): Promise<ReferenceResult> {
  try {
    const [campusList, unitList, departmentList, officeList, sdgList, requirementList] =
      await Promise.all([
        api.reference.list('campuses'),
        api.reference.list('units'),
        api.reference.list('departments'),
        api.reference.list('offices'),
        api.reference.list('sdgs'),
        api.reference.list('attachment-requirements'),
      ]);

    return {
      references: {
        campuses: campusList.items,
        units: unitList.items,
        departments: departmentList.items,
        offices: officeList.items,
        sdgs: sdgList.items,
        requirements: requirementList.items,
      },
    };
  } catch (error) {
    return { requestId: error instanceof ApiError ? error.requestId : undefined };
  }
}

/**
 * Submit pipeline for a first submission (§4): persist, ask the server to
 * validate, then submit. The server's field list is returned as-is; no rule is
 * re-implemented here. A 409 means someone else changed the report.
 */

export type SubmitOutcome =
  | { kind: 'submitted'; result: SubmitReportResponse }
  | { kind: 'invalid'; issues: ReportValidationIssue[] }
  | { kind: 'conflict' }
  | { kind: 'error'; message: string; requestId?: string };

export async function submitNewReport(options: {
  reportId: string;
  input: ReportFormInput;
  idempotencyKey: string;
}): Promise<SubmitOutcome> {
  const { reportId, input, idempotencyKey } = options;

  try {
    await api.reports.update(reportId, input);

    const validation = await api.reports.validate(reportId);
    if (!validation.valid || validation.issues.length > 0) {
      return { kind: 'invalid', issues: validation.issues };
    }

    return { kind: 'submitted', result: await api.reports.submit(reportId, idempotencyKey) };
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) return { kind: 'conflict' };

    return {
      kind: 'error',
      message:
        error instanceof ApiError ? error.message : 'The report was not submitted. Try again.',
      ...(error instanceof ApiError && error.requestId ? { requestId: error.requestId } : {}),
    };
  }
}
