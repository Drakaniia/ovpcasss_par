<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount, untrack } from 'svelte';
  import type { Snippet } from 'svelte';

  import ErrorState from '$lib/components/ErrorState.svelte';
  import SkeletonDocument from '$lib/components/SkeletonDocument.svelte';
  import { session } from '$lib/session/session.svelte';

  import { attachmentRows } from '../application/facsimile-attachments';
  import { commentRounds } from '../application/facsimile-history';
  import { personRows, signatureBlock } from '../application/facsimile-people';
  import { FacsimileState } from '../application/facsimile-state.svelte';
  import { separationNotice } from '../application/facsimile-workflow';
  import FacsimileDocument from './FacsimileDocument.svelte';
  import FacsimileHeader from './FacsimileHeader.svelte';
  import FacsimileRail from './FacsimileRail.svelte';
  import PrintPreview from './PrintPreview.svelte';
  import ReportHistory from './ReportHistory.svelte';
  import WorkflowStepper from './WorkflowStepper.svelte';

  /**
   * Record mode and print preview (UI spec §7.7, §7.8). The page reads one
   * report plus the three reference lists the document needs, redirects a draft
   * to the editor, and leaves the phase 09 decisions to the rail's `actions`.
   */
  let {
    id,
    print = false,
    backHref = '/reports',
    backLabel = 'My reports',
    actions,
    facsimileState,
  }: {
    id: string;
    print?: boolean;
    backHref?: string;
    backLabel?: string;
    actions?: Snippet;
    /**
     * The queue routes pass their own state so a decision can replace the loaded
     * report with the API response; every other route lets the page own it.
     */
    facsimileState?: FacsimileState;
  } = $props();

  const ownState = untrack(() => new FacsimileState(id));
  const facsimile = $derived(facsimileState ?? ownState);
  const detail = $derived(facsimile.detail);

  let redirecting = $state(false);

  // The facsimile of a draft is not useful; the report belongs in the editor.
  $effect(() => {
    if (facsimile.view !== 'ready' || detail?.status !== 'DRAFT') return;
    redirecting = true;
    void goto(`/reports/${id}/edit`, { replaceState: true });
  });

  const people = $derived(detail ? personRows(detail) : []);
  const attachments = $derived(detail ? attachmentRows(detail) : []);
  const rounds = $derived(detail ? commentRounds(detail) : []);
  const signatures = $derived(detail ? signatureBlock(detail) : null);
  const notice = $derived(
    detail
      ? separationNotice({
          status: detail.status,
          ownerUserId: detail.ownerUserId,
          userId: session.user?.id ?? null,
          role: session.user?.role ?? null,
        })
      : null,
  );
  const pageTitle = $derived(
    detail
      ? `${detail.trackingNumber ?? 'Report'} · ${detail.form.title} · OVPCASSS Paperless PAR`
      : 'Report · OVPCASSS Paperless PAR',
  );

  onMount(() => void facsimile.load());
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

{#if facsimile.view === 'not-found'}
  <ErrorState variant="not-found" {backHref} backLabel="Back to reports" />
{:else if facsimile.view === 'error'}
  <ErrorState
    requestId={facsimile.requestId}
    onretry={() => void facsimile.load()}
    {backHref}
    backLabel="Back to reports"
  />
{:else if !detail || redirecting || facsimile.view === 'loading'}
  <div class="facsimile-loading" aria-busy="true">
    <span class="sr-only">Loading the report</span>
    <div class="loading-head" aria-hidden="true">
      <div class="skeleton line back"></div>
      <div class="skeleton line title"></div>
      <div class="skeleton line strip"></div>
    </div>

    <SkeletonDocument />
  </div>
{:else if print}
  <PrintPreview
    {detail}
    references={facsimile.references}
    {rounds}
    block={signatures ?? { submittedBy: '—' }}
    pdfBusy={facsimile.pdf.busy}
    pdfError={facsimile.pdf.error}
    ondownload={() => void facsimile.downloadPdf()}
  />
{:else}
  <div class="record-view">
    <FacsimileHeader {detail} {backHref} {backLabel} />

    <div class="document-row">
      <div class="document-column">
        <div class="stepper-above">
          <WorkflowStepper status={detail.status} />
        </div>

        <FacsimileDocument
          {detail}
          references={facsimile.references}
          {rounds}
          block={signatures ?? { submittedBy: '—' }}
        />
      </div>

      <FacsimileRail
        {detail}
        {people}
        {attachments}
        busyAttachmentId={facsimile.attachmentBusy}
        attachmentErrors={facsimile.attachmentErrors}
        onattachment={(row) => void facsimile.openAttachment(row)}
        {notice}
        acknowledgement={facsimile.acknowledgement}
        onacknowledgement={() => void facsimile.downloadAcknowledgement()}
        {actions}
      />
    </div>

    <ReportHistory {detail} />
  </div>
{/if}

<style>
  .document-row {
    align-items: start;
    display: grid;
    gap: 32px;
    grid-template-columns: minmax(0, 820px) 300px;
    justify-content: space-between;
  }

  .document-column {
    min-width: 0;
  }

  .stepper-above {
    margin-bottom: 20px;
    padding: 0 2px;
  }

  @media (max-width: 1439px) {
    .document-row {
      gap: 24px;
      grid-template-columns: minmax(0, 820px) 280px;
    }
  }

  /* Below 1280 px the rail stacks below the document and the stepper moves
     into the History panel, so it is never rendered twice. */
  @media (max-width: 1279px) {
    .document-row {
      grid-template-columns: minmax(0, 1fr);
    }

    .stepper-above {
      display: none;
    }
  }

  .facsimile-loading {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .loading-head {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .line {
    height: 14px;
  }

  .back {
    width: 120px;
  }

  .title {
    height: 26px;
    width: 44%;
  }

  .strip {
    width: 30%;
  }
</style>
