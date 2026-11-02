import {
  emailTemplateCopySchema,
  emailTemplateIssues,
  type EmailKind,
  type EmailTemplateCopy,
  type EmailTemplateDetail,
  type EmailTemplateIssue,
  type EmailTemplatePreviewResponse,
  type EmailTemplateSummary,
} from '@par/shared';
import { goto } from '$app/navigation';

import { api } from '$lib/api/client';
import { ApiError } from '$lib/api/http';
import { loadSession } from '$lib/session/session.svelte';
import { toast } from '$lib/toast/toast.svelte';

import { draftFrom, sameCopy } from './email-template-draft';

export type EmailMessagesView = 'loading' | 'ready' | 'denied' | 'error';
export type PreviewTab = 'subject' | 'text' | 'html';

/**
 * The message editor's state (email message editor spec §8). The kind owns the
 * structure; this class owns the office's draft, what is saved, and the preview
 * the API rendered for it.
 */
export class EmailMessagesState {
  view = $state<EmailMessagesView>('loading');
  items = $state<EmailTemplateSummary[]>([]);
  kind = $state<EmailKind>('ASSIGNED');
  detail = $state<EmailTemplateDetail | null>(null);
  draft = $state<EmailTemplateCopy | null>(null);
  issues = $state<EmailTemplateIssue[]>([]);

  loadError = $state<string | null>(null);
  detailError = $state<string | null>(null);
  saveError = $state<string | null>(null);
  saving = $state(false);
  restoring = $state(false);
  loadingDetail = $state(false);

  preview = $state<EmailTemplatePreviewResponse | null>(null);
  previewTab = $state<PreviewTab>('html');
  previewError = $state<string | null>(null);
  previewing = $state(false);
  previewPending = $state(false);

  private previewRequest = 0;

  /** The draft differs from the copy in use. */
  get dirty(): boolean {
    return Boolean(this.detail && this.draft && !sameCopy(this.draft, this.detail.copy));
  }

  get selected(): EmailTemplateSummary | undefined {
    return this.items.find((item) => item.kind === this.kind);
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
    } catch {
      this.view = 'error';
      this.loadError = 'The messages did not load. Check your connection and try again.';
      return;
    }

    try {
      const response = await api.settings.emailTemplates.list();
      this.items = response.items;
      this.view = 'ready';
    } catch (error) {
      this.fail(error, 'load');
      return;
    }

    await this.open('ASSIGNED');
  }

  async fetchList(): Promise<void> {
    this.loadError = null;
    try {
      const response = await api.settings.emailTemplates.list();
      this.items = response.items;
    } catch (error) {
      this.loadError = errorMessage(error, 'The messages did not reload. Try again.');
    }
  }

  /** Load one kind; the caller asks about unsaved edits before calling this. */
  async open(kind: EmailKind): Promise<void> {
    this.kind = kind;
    this.detail = null;
    this.draft = null;
    this.issues = [];
    this.detailError = null;
    this.saveError = null;
    this.preview = null;
    this.previewError = null;
    this.previewPending = false;
    this.loadingDetail = true;

    try {
      const response = await api.settings.emailTemplates.get(kind);
      this.apply(response.template);
    } catch (error) {
      this.fail(error, 'detail');
    } finally {
      this.loadingDetail = false;
    }
  }

  /**
   * Save the draft. Local rules run first, so a missing token or a typed link is
   * named on the field before a request is made; the API applies the same rules.
   */
  async save(): Promise<boolean> {
    const draft = this.draft;
    if (!draft || !this.detail || this.saving) return false;

    const issues = emailTemplateIssues(this.kind, draft);
    const parsed = emailTemplateCopySchema.safeParse(draft);
    if (!parsed.success) {
      issues.push(
        ...parsed.error.issues.map((issue) => ({
          path: issue.path.map(String).join('.'),
          message: issue.message,
        })),
      );
    }
    this.issues = issues;
    this.saveError = null;
    if (issues.length > 0) return false;

    this.saving = true;
    try {
      const response = await api.settings.emailTemplates.save(this.kind, draft);
      this.apply(response.template);
      toast.success(
        `${response.template.label} message saved. It will be used for the next email sent.`,
      );
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        this.view = 'denied';
        return false;
      }
      const fields = issueDetails(error);
      if (fields.length > 0) this.issues = fields;
      this.saveError = errorMessage(error, 'The message was not saved. Try again.');
      return false;
    } finally {
      this.saving = false;
    }
  }

  async restore(): Promise<boolean> {
    if (this.restoring) return false;
    this.restoring = true;

    try {
      const response = await api.settings.emailTemplates.restore(this.kind);
      this.apply(response.template);
      toast.success(`${response.template.label} message restored to the built-in copy.`);
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        this.view = 'denied';
        return false;
      }
      this.saveError = errorMessage(error, 'The built-in copy could not be restored. Try again.');
      return false;
    } finally {
      this.restoring = false;
    }
  }

  async restoreAll(): Promise<boolean> {
    if (this.restoring) return false;
    this.restoring = true;

    try {
      const response = await api.settings.emailTemplates.restoreAll();
      toast.success(
        response.restored === 0
          ? 'Every message already uses the built-in copy.'
          : `${response.restored} ${response.restored === 1 ? 'message was' : 'messages were'} restored to the built-in copy.`,
      );
      await this.fetchList();
      await this.open(this.kind);
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        this.view = 'denied';
        return false;
      }
      this.saveError = errorMessage(error, 'The built-in copy could not be restored. Try again.');
      return false;
    } finally {
      this.restoring = false;
    }
  }

  /**
   * Render the submitted draft through the API. The last good render stays
   * visible when this fails, so a network blip does not empty the pane.
   */
  async renderPreview(): Promise<void> {
    const draft = this.draft;
    if (!draft) return;

    const request = ++this.previewRequest;
    this.previewing = true;
    this.previewError = null;

    try {
      const response = await api.settings.emailTemplates.preview(this.kind, draft);
      if (request === this.previewRequest) this.preview = response;
    } catch (error) {
      if (request !== this.previewRequest) return;
      this.previewError = errorMessage(error, 'The preview did not render. Try again.');
    } finally {
      if (request === this.previewRequest) {
        this.previewing = false;
        this.previewPending = false;
      }
    }
  }

  private apply(template: EmailTemplateDetail): void {
    this.detail = template;
    this.draft = draftFrom(template.copy);
    this.issues = [];
    this.saveError = null;

    this.items = this.items.map((item) =>
      item.kind === template.kind
        ? {
            ...item,
            edited: template.edited,
            unreadable: template.unreadable,
            subject: template.copy.subject,
            updatedAt: template.updatedAt,
            updatedByName: template.updatedByName,
          }
        : item,
    );
  }

  private fail(error: unknown, where: 'load' | 'detail'): void {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      this.view = 'denied';
      return;
    }

    const message = errorMessage(error, 'The request did not complete. Try again.');
    if (where === 'load') {
      this.loadError = message;
      this.view = 'error';
      return;
    }
    this.detailError = message;
  }
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

/** The API sends `{ path: string[], message, token? }` on a refused save. */
function issueDetails(error: unknown): EmailTemplateIssue[] {
  if (!(error instanceof ApiError) || !Array.isArray(error.details)) return [];

  const issues: EmailTemplateIssue[] = [];
  for (const detail of error.details) {
    if (typeof detail !== 'object' || detail === null) continue;
    const record = detail as { path?: unknown; message?: unknown; token?: unknown };
    if (typeof record.message !== 'string') continue;
    issues.push({
      path: Array.isArray(record.path) ? record.path.join('.') : '',
      message: record.message,
      ...(typeof record.token === 'string' ? { token: record.token } : {}),
    });
  }
  return issues;
}
