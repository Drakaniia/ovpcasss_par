import type { DecisionAction, ReportDetail } from '@par/shared';

import { ApiError } from '$lib/api/http';
import { session } from '$lib/session/session.svelte';
import { toast } from '$lib/toast/toast.svelte';

import {
  decisionRequest,
  decisionSpec,
  isDecisionConflict,
  validateDecisionComment,
  type DecisionSubject,
} from './queue-decisions';

export type DecisionFailure = { message: string; requestId?: string };

/**
 * The decision drawer's state (UI spec §7.10). One controller serves the queue's
 * preview pane, the full report page, and the keyboard shortcuts, so every entry
 * point opens the same drawer with the same rules.
 */
export class DecisionController {
  open = $state(false);
  action = $state<DecisionAction>('RETURN');
  subject = $state<DecisionSubject | null>(null);
  note = $state('');
  notify = $state(true);
  busy = $state(false);
  commentError = $state<string | undefined>(undefined);
  failure = $state<DecisionFailure | null>(null);
  /** Someone else decided first; the drawer stays open and names the way out. */
  stale = $state(false);

  private readonly ondecided: (detail: ReportDetail) => void;
  private readonly onstale: () => void;

  constructor(options: { ondecided: (detail: ReportDetail) => void; onstale: () => void }) {
    this.ondecided = options.ondecided;
    this.onstale = options.onstale;
  }

  get spec() {
    return this.subject ? decisionSpec(this.action, this.subject) : null;
  }

  get dirty(): boolean {
    return this.note.trim().length > 0;
  }

  /** No signature on file blocks approving, with the way to add one (UI spec §7.10). */
  get signatureMissing(): boolean {
    return this.action === 'APPROVE' && session.user?.hasSignature === false;
  }

  get canSubmit(): boolean {
    return !this.busy && !this.signatureMissing && !this.stale;
  }

  start(action: DecisionAction, subject: DecisionSubject) {
    this.action = action;
    this.subject = subject;
    this.note = '';
    this.notify = true;
    this.commentError = undefined;
    this.failure = null;
    this.stale = false;
    this.open = true;
  }

  /** The drawer has closed; the next open starts from an empty form. */
  afterClose() {
    this.reset();
  }

  /** True when closing now would drop what the user typed. */
  get needsDiscardConfirm(): boolean {
    return this.dirty;
  }

  async submit() {
    const subject = this.subject;
    const spec = this.spec;
    if (!subject || !spec || this.busy || this.stale || this.signatureMissing) return;

    const values = { note: this.note, notifySubmitter: this.notify };
    const errors = validateDecisionComment(this.action, values);
    const fieldError = errors.comments ?? errors.note;

    if (fieldError) {
      this.commentError = fieldError;
      return;
    }

    this.commentError = undefined;
    this.failure = null;
    this.busy = true;

    try {
      const detail = await decisionRequest(this.action, subject, values);
      this.reset();
      this.open = false;
      toast.success(spec.successToast);
      this.ondecided(detail);
    } catch (error) {
      if (isDecisionConflict(error)) {
        this.stale = true;
        return;
      }

      this.failure = {
        message:
          error instanceof ApiError
            ? `The decision was not recorded. ${error.message}`
            : 'The decision was not recorded. Check your connection and try again.',
        requestId: error instanceof ApiError ? error.requestId : undefined,
      };
    } finally {
      this.busy = false;
    }
  }

  /** Confirms a lost race: reload what the server holds and point at it. */
  viewCurrent() {
    this.onstale();
    this.reset();
    this.open = false;
  }

  private reset() {
    this.note = '';
    this.notify = true;
    this.commentError = undefined;
    this.failure = null;
    this.stale = false;
  }
}
