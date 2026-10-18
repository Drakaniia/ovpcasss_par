import type { ReportDraft } from '@par/shared';

import { formatTime } from '$lib/format/datetime';

import { draftFormFromWizard, newId, type WizardForm, type WizardStep } from './wizard-form';

/**
 * Draft lifecycle for the wizard (UI spec §7.5). Autosave is local-first and
 * silent: the header always shows the last save time, and a failure is a text
 * action, never a modal.
 */

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export type SaveState = { status: SaveStatus; savedAt: string | null };

export const INITIAL_SAVE_STATE: SaveState = { status: 'idle', savedAt: null };

export function newDraftId(): string {
  return newId('draft');
}

export function newIdempotencyKey(): string {
  return newId('submit');
}

export function buildDraft(options: {
  id: string;
  serverId?: string;
  version?: number;
  step: WizardStep;
  form: WizardForm;
  updatedAt?: string;
}): ReportDraft {
  return {
    id: options.id,
    ...(options.serverId ? { serverId: options.serverId } : {}),
    version: options.version ?? 1,
    updatedAt: options.updatedAt ?? new Date().toISOString(),
    step: options.step,
    form: draftFormFromWizard(options.form),
  };
}

export function saveStatusText(state: SaveState): string {
  switch (state.status) {
    case 'saving':
      return 'Saving…';
    case 'saved':
      return state.savedAt ? `Draft saved ${formatTime(state.savedAt)}` : 'Draft saved';
    case 'error':
      return 'Not saved — Retry';
    default:
      return 'Not saved yet';
  }
}

export function restoredNotice(savedAt: string | null): string {
  return savedAt
    ? `Restored from a saved draft · Draft saved ${formatTime(savedAt)}`
    : 'Restored from a saved draft';
}
