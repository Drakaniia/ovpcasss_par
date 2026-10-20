<script lang="ts">
  import { page } from '$app/state';
  import { onMount, untrack } from 'svelte';

  import EmptyState from '$lib/components/EmptyState.svelte';
  import ErrorState from '$lib/components/ErrorState.svelte';
  import SkeletonTable from '$lib/components/SkeletonTable.svelte';

  import { ExportState } from '../application/export-state.svelte';
  import ExportForm from './ExportForm.svelte';
  import ExportPreviewDialog from './ExportPreviewDialog.svelte';
  import ExportPreviewTable from './ExportPreviewTable.svelte';

  const state = new ExportState();

  onMount(() => {
    void state.load(page.url.searchParams);
  });

  // One debounced preview per term or sheet change; the previous preview stays.
  $effect(() => {
    const request = state.request;

    if (state.view !== 'ready' || !state.schoolYear || !state.hasTerms) return;

    const timer = setTimeout(() => void untrack(() => state.loadPreview(request)), 300);
    return () => clearTimeout(timer);
  });
</script>

<svelte:head><title>Monitoring exports · OVPCASSS Paperless PAR</title></svelte:head>

{#if state.view === 'denied'}
  <div class="card">
    <ErrorState
      variant="permission"
      title="You do not have access to monitoring exports"
      description="Monitoring exports are available to reviewers, approvers, and administrators. Contact the OVPCASSS administrator if you believe this is a mistake."
      backHref="/"
      backLabel="Back to inbox"
    />
  </div>
{:else if state.view === 'error'}
  <div class="card">
    <ErrorState
      title="We could not load the export screen"
      description="The request did not complete. Try again, or return to your inbox."
      onretry={() => location.reload()}
      backHref="/"
      backLabel="Back to inbox"
    />
  </div>
{:else if state.view === 'loading'}
  <SkeletonTable rows={6} widths={[20, 32, 16, 16, 12]} />
{:else}
  <header class="page-head">
    <h1>Monitoring sheet export</h1>
    <p class="lede">
      Reviews and downloads the office's monitoring workbook for the term: the selected sheet
      filled, the other two blank.
    </p>
  </header>

  {#if !state.hasTerms}
    <div class="card">
      <EmptyState
        title="No terms are configured"
        description={state.userRole === 'ADMIN'
          ? 'Add a school year and semester in Reference data before exporting a monitoring sheet.'
          : 'Ask an administrator to add a school year and semester in Reference data before exporting a monitoring sheet.'}
        action={state.userRole === 'ADMIN'
          ? { label: 'Open reference data', href: '/admin/reference-data' }
          : undefined}
        actionVariant="outline"
      />
    </div>
  {:else}
    <ExportForm
      bind:type={state.activeType}
      bind:schoolYear={state.schoolYear}
      bind:semester={state.semester}
      bind:includeInProgress={state.includeInProgress}
      schoolYears={state.schoolYears}
      semesters={state.semesterOptions}
      previewLoading={state.previewLoading}
      canDownload={state.canDownload}
      downloading={state.downloading}
      ondownload={() => state.requestDownload()}
      ontemplate={() => void state.downloadTemplate()}
    />

    {#if state.templateError}
      <p class="inline-error" role="alert">{state.templateError}</p>
    {/if}
    {#if state.downloadError}
      <div class="inline-error" role="alert">
        <p>{state.downloadError.message}</p>
        {#if state.downloadError.requestId}
          <p class="request-id">Request ID: {state.downloadError.requestId}</p>
        {/if}
        <button
          class="btn btn-outline btn-sm"
          type="button"
          onclick={() => void state.download()}
          disabled={state.downloading}
        >
          Retry
        </button>
      </div>
    {/if}

    {#if state.previewLoading}
      <p class="updating" role="status">Updating preview…</p>
    {/if}

    {#if state.previewError}
      <div class="card preview-error">
        <ErrorState
          title="We could not build the preview"
          description={state.previewError}
          onretry={() => void state.loadPreview()}
          backHref="/search"
          backLabel="Back to repository"
        />
      </div>
    {:else if state.preview && state.activeSheet}
      <ExportPreviewTable sheet={state.activeSheet} />

      {#if state.totalRows === 0}
        <p class="empty-line">
          No approved reports for {state.semesterLabel(state.semester)}, SY {state.schoolYear}. The
          sheet is still written with its title and headers.
          <a href={state.searchHref}>Open the repository</a>
          to check the scope or add a report.
        </p>
      {/if}
    {:else if state.previewLoading}
      <SkeletonTable rows={8} widths={[8, 14, 18, 24, 12, 16]} />
    {/if}

    {#if state.userRole === 'ADMIN'}
      <p class="admin-link">
        Have an existing workbook? <a href="/admin/import">Import a monitoring workbook</a>.
      </p>
    {/if}
  {/if}
{/if}

{#if state.activeSheet}
  <ExportPreviewDialog
    bind:open={state.previewOpen}
    sheet={state.activeSheet}
    termLabel="{state.semesterLabel(state.semester)} · SY {state.schoolYear}"
    includeInProgress={state.includeInProgress}
    downloading={state.downloading}
    ondownload={() => void state.download()}
  />
{/if}

<style>
  .page-head {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-bottom: 16px;
  }

  h1 {
    margin: 0;
  }

  .lede {
    color: var(--text-secondary);
    font-size: 13px;
    margin: 0;
  }

  .updating {
    color: var(--text-secondary);
    font-size: 12px;
    margin: 8px 0 0;
  }

  .inline-error {
    background: var(--status-danger-bg);
    border: 1px solid var(--status-danger-fg);
    border-radius: var(--radius-card);
    color: var(--status-danger-fg);
    display: flex;
    flex-direction: column;
    font-size: 13px;
    gap: 6px;
    margin: 12px 0 0;
    padding: 8px 12px;
  }

  .inline-error p {
    margin: 0;
  }

  .request-id {
    font-family: var(--font-mono);
    font-size: 11px;
    opacity: 0.8;
  }

  .empty-line {
    color: var(--text-secondary);
    font-size: 13px;
    margin: 12px 0 0;
  }

  .preview-error,
  .admin-link {
    margin-top: 16px;
  }

  .admin-link {
    color: var(--text-secondary);
    font-size: 12px;
  }
</style>
