import { goto } from '$app/navigation';
import {
  emailTestInputSchema,
  OFFICE_EMAIL_ADDRESS,
  type EmailSenderResponse,
  type EmailTestResponse,
} from '@par/shared';

import { api } from '$lib/api/client';
import { ApiError } from '$lib/api/http';
import { loadSession } from '$lib/session/session.svelte';
import { toast } from '$lib/toast/toast.svelte';

import {
  EMAIL_PROVIDER_LABELS,
  EMPTY_SENDER_DRAFT,
  hasUnsavedSenderChanges,
  validateSenderDraft,
  type EmailSenderDraft,
} from './email-sender';

export type EmailVariablesView = 'loading' | 'ready' | 'denied' | 'error';

export class EmailVariablesState {
  view = $state<EmailVariablesView>('loading');
  saved = $state<EmailSenderResponse | null>(null);
  draft = $state<EmailSenderDraft>({ ...EMPTY_SENDER_DRAFT });
  errors = $state<Record<string, string>>({});
  loadError = $state<string | null>(null);
  saveError = $state<string | null>(null);
  saving = $state(false);

  /** The test message (email spec §9.6): one recipient, sent through the saved pair. */
  testTo = $state(OFFICE_EMAIL_ADDRESS);
  testFieldError = $state<string | null>(null);
  testError = $state<string | null>(null);
  testResult = $state<{ to: string; provider: EmailTestResponse['provider'] } | null>(null);
  testing = $state(false);

  get keySaved(): boolean {
    return this.saved?.apiKeySet ?? false;
  }

  /** The adapter in use is chosen by the deployment, never by this page. */
  get providerLabel(): string {
    return this.saved ? EMAIL_PROVIDER_LABELS[this.saved.provider] : '';
  }

  get consoleAdapter(): boolean {
    return this.saved?.provider === 'console';
  }

  /** The test sends what is saved, so a pending edit is reported instead of silently ignored. */
  get unsavedChanges(): boolean {
    return this.saved ? hasUnsavedSenderChanges(this.draft, this.saved.from) : false;
  }

  get testSummary(): string | null {
    if (!this.testResult) return null;
    if (this.testResult.provider === 'console') {
      return 'The console adapter is selected, so the message went to the Worker log and not to a mailbox. No key saved here can change that: set EMAIL_PROVIDER to brevo or resend before trusting this pair.';
    }

    return `Sent to ${this.testResult.to} through ${EMAIL_PROVIDER_LABELS[this.testResult.provider]}.`;
  }

  async load(): Promise<void> {
    this.view = 'loading';

    try {
      const account = await loadSession();
      if (!account) {
        await goto('/login', { replaceState: true });
        return;
      }
      if (account.role !== 'ADMIN') {
        this.view = 'denied';
        return;
      }
      // The office mailbox is the default test recipient, so a test never lands
      // in whoever happens to be signed in.
      if (!this.testTo) this.testTo = OFFICE_EMAIL_ADDRESS;
    } catch {
      this.view = 'error';
      return;
    }

    await this.fetch();
  }

  async fetch(): Promise<void> {
    this.loadError = null;

    try {
      this.saved = await api.settings.emailSender();
      this.draft = { from: this.saved.from, apiKey: '' };
      this.view = 'ready';
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        this.view = 'denied';
        return;
      }
      this.loadError =
        error instanceof ApiError ? error.message : 'The email variables did not load. Try again.';
      this.view = 'error';
    }
  }

  async save(): Promise<void> {
    if (this.saving || !this.saved) return;

    const { errors, input } = validateSenderDraft(this.draft, this.keySaved);
    this.errors = errors;
    this.saveError = null;
    if (!input) return;

    this.saving = true;
    try {
      this.saved = await api.settings.saveEmailSender(input);
      this.draft = { from: this.saved.from, apiKey: '' };
      toast.success('Email variables saved');
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        this.view = 'denied';
        return;
      }
      // A 400 names the field it is about, so draw the highlight the banner
      // asks for instead of leaving the form unmarked.
      const issues = fieldErrors(error);
      if (issues) {
        this.errors = issues;
        return;
      }
      this.saveError =
        error instanceof ApiError
          ? error.message
          : 'The email variables were not saved. Check your connection and try again.';
    } finally {
      this.saving = false;
    }
  }

  async sendTest(): Promise<void> {
    if (this.testing) return;

    this.testError = null;
    this.testResult = null;

    const parsed = emailTestInputSchema.safeParse({ to: this.testTo });
    if (!parsed.success) {
      this.testFieldError =
        parsed.error.issues[0]?.message ?? 'Enter the address to send the test to.';
      return;
    }
    this.testFieldError = null;

    if (this.unsavedChanges) {
      this.testError = 'Save the variables first. The test sends the pair that is saved.';
      return;
    }

    this.testing = true;
    try {
      this.testResult = await api.settings.testEmailSender(parsed.data);
      this.testTo = parsed.data.to;
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        this.view = 'denied';
        return;
      }
      this.testError =
        error instanceof ApiError
          ? error.message
          : 'The test message was not sent. Check your connection and try again.';
    } finally {
      this.testing = false;
    }
  }
}

/** The API's validation details keyed by field; Zod issues carry `path` instead. */
function fieldErrors(error: unknown): Record<string, string> | null {
  if (!(error instanceof ApiError) || !Array.isArray(error.details)) return null;

  const errors: Record<string, string> = {};
  for (const issue of error.details) {
    if (typeof issue !== 'object' || issue === null) continue;
    const record = issue as { field?: unknown; path?: unknown; message?: unknown };
    const field =
      typeof record.field === 'string'
        ? record.field
        : Array.isArray(record.path)
          ? String(record.path[0] ?? '')
          : '';

    if (field !== '' && typeof record.message === 'string' && !errors[field]) {
      errors[field] = record.message;
    }
  }

  return Object.keys(errors).length > 0 ? errors : null;
}
