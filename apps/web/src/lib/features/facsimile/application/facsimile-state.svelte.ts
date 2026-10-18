import type { Campus, ReportDetail, Sdg, Unit } from '@par/shared';
import { goto } from '$app/navigation';

import { api } from '$lib/api/client';
import { ApiError } from '$lib/api/http';
import { clearSession } from '$lib/session/session.svelte';

import { ensureActiveSession } from '$lib/features/reports/application/edit-returned-requests';

import type { AttachmentRow } from './facsimile-attachments';
import type { FacsimileReferences } from './facsimile-document';

/**
 * Facsimile page state (UI phase 08). One read builds the document and the
 * rail; signed-URL actions are the only writes and each failure stays next to
 * the control that caused it.
 */

export type FacsimileView = 'loading' | 'ready' | 'not-found' | 'error';

export type DownloadState = { busy: boolean; error?: string };

function emptyReferences(): FacsimileReferences {
  return { campuses: [], units: [], sdgs: [] };
}

function followSignedUrl(url: string, openInTab: boolean): void {
  if (typeof window === 'undefined') return;

  if (openInTab) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }

  const link = document.createElement('a');
  link.href = url;
  link.rel = 'noopener';
  link.download = '';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export class FacsimileState {
  view = $state<FacsimileView>('loading');
  requestId = $state<string | undefined>();
  detail = $state<ReportDetail | null>(null);
  references = $state<FacsimileReferences>(emptyReferences());

  /** Attachment id whose signed URL is being fetched. */
  attachmentBusy = $state<string | null>(null);
  attachmentErrors = $state<Record<string, string>>({});

  acknowledgement = $state<DownloadState>({ busy: false });
  pdf = $state<DownloadState>({ busy: false });

  private readonly id: string;

  constructor(id: string) {
    this.id = id;
  }

  async load() {
    this.view = 'loading';
    this.requestId = undefined;

    const gate = await ensureActiveSession();
    if (gate !== 'ok') {
      if (gate === 'error') this.view = 'error';
      return;
    }

    try {
      const [detail, campuses, units, sdgs] = await Promise.all([
        api.reports.get(this.id),
        api.reference.list('campuses'),
        api.reference.list('units'),
        api.reference.list('sdgs'),
      ]);

      this.detail = detail;
      this.references = {
        campuses: campuses.items as Campus[],
        units: units.items as Unit[],
        sdgs: sdgs.items as Sdg[],
      };
      this.view = 'ready';
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearSession();
        await goto('/login', { replaceState: true });
        return;
      }
      // A report that is missing and one the caller may not see answer the same
      // way, so the page cannot be used to confirm that a report exists.
      if (error instanceof ApiError && (error.status === 403 || error.status === 404)) {
        this.view = 'not-found';
        return;
      }

      this.requestId = error instanceof ApiError ? error.requestId : undefined;
      this.view = 'error';
    }
  }

  async openAttachment(row: AttachmentRow) {
    if (this.attachmentBusy) return;

    this.attachmentBusy = row.id;
    this.clearAttachmentError(row.id);

    try {
      const { url } = await api.attachments.url(this.id, row.id);
      followSignedUrl(url, row.preview);
    } catch (error) {
      this.attachmentErrors = {
        ...this.attachmentErrors,
        [row.id]: error instanceof ApiError ? error.message : 'The file did not open. Try again.',
      };
    } finally {
      this.attachmentBusy = null;
    }
  }

  private clearAttachmentError(id: string) {
    if (!this.attachmentErrors[id]) return;
    const next = { ...this.attachmentErrors };
    delete next[id];
    this.attachmentErrors = next;
  }

  async downloadPdf() {
    this.pdf = { busy: true };

    try {
      const { url } = await api.reports.pdf(this.id);
      followSignedUrl(url, false);
      this.pdf = { busy: false };
    } catch (error) {
      this.pdf = {
        busy: false,
        error:
          error instanceof ApiError
            ? `The PDF was not generated. ${error.message}`
            : 'The PDF was not generated. Check your connection and try again.',
      };
    }
  }

  async downloadAcknowledgement() {
    if (this.detail?.status !== 'APPROVED') return;

    this.acknowledgement = { busy: true };

    try {
      const { url } = await api.reports.acknowledgement(this.id);
      followSignedUrl(url, false);
      this.acknowledgement = { busy: false };
    } catch (error) {
      this.acknowledgement = {
        busy: false,
        error:
          error instanceof ApiError
            ? `The acknowledgement was not downloaded. ${error.message}`
            : 'The acknowledgement was not downloaded. Check your connection and try again.',
      };
    }
  }
}
