<script lang="ts">
  import type { MonitoringImportResponse } from '@par/shared';
  import { onMount } from 'svelte';

  import { api } from '$lib/api/client';
  import { ApiError, saveBlob } from '$lib/api/http';
  import ErrorState from '$lib/components/ErrorState.svelte';
  import { loadSession, session } from '$lib/session/session.svelte';

  type View = 'loading' | 'ready' | 'denied' | 'error';

  let view = $state<View>('loading');
  let file = $state<File | null>(null);
  let uploading = $state(false);
  let result = $state<MonitoringImportResponse | null>(null);
  let error = $state<string | null>(null);
  let templateError = $state<string | null>(null);

  onMount(async () => {
    try {
      await loadSession();
    } catch {
      view = 'error';
      return;
    }

    view = session.user?.role === 'ADMIN' ? 'ready' : 'denied';
  });

  function choose(event: Event) {
    file = (event.currentTarget as HTMLInputElement).files?.[0] ?? null;
    result = null;
    error = null;
  }

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (!file || uploading) return;

    uploading = true;
    error = null;
    result = null;

    try {
      result = await api.imports.monitoring(file);
    } catch (requestError) {
      error =
        requestError instanceof ApiError
          ? requestError.message
          : 'The workbook was not imported. Try again.';
    } finally {
      uploading = false;
    }
  }

  async function downloadTemplate() {
    templateError = null;

    try {
      saveBlob(await api.exports.template(), 'OVPCASSS-Monitoring-Template.xlsx');
    } catch (requestError) {
      templateError =
        requestError instanceof ApiError
          ? requestError.message
          : 'The template did not download. Try again.';
    }
  }

  const ACTION_LABELS = { created: 'Created', updated: 'Updated', failed: 'Not imported' } as const;
</script>

<svelte:head><title>Import workbook · OVPCASSS Paperless PAR</title></svelte:head>

{#if view === 'denied'}
  <div class="card">
    <ErrorState
      variant="permission"
      requiredRole="ADMIN"
      title="You do not have access to workbook import"
      description="Importing a monitoring workbook is an administrator action."
      backHref="/admin/users"
      backLabel="Back to admin"
    />
  </div>
{:else if view === 'error'}
  <div class="card">
    <ErrorState
      title="We could not load the import screen"
      description="The request did not complete. Reload the page to try again."
      onretry={() => location.reload()}
      backHref="/admin/users"
      backLabel="Back to admin"
    />
  </div>
{:else if view === 'loading'}
  <p class="loading" role="status">Loading…</p>
{:else}
  <header class="page-head">
    <h1>Import a monitoring workbook</h1>
    <p class="lede">
      Upload the office's filled workbook. Rows are matched by tracking number: new numbers create
      reports, existing ones update their monitoring fields.
    </p>
  </header>

  <form class="card import-form" onsubmit={submit}>
    <div class="field">
      <label class="field-label" for="workbook">Monitoring workbook (.xlsx)</label>
      <input
        id="workbook"
        class="input"
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        onchange={choose}
        required
      />
      <p class="field-hint">
        Reads the OFF-CAMPUS, EDUCATIONAL TOUR, and IN-CAMPUS sheets. Blank template lines are
        skipped, and rows that fail validation are reported and not written.
      </p>
    </div>

    <div class="actions">
      <button class="btn btn-outline" type="button" onclick={() => void downloadTemplate()}>
        Download blank template
      </button>
      <button class="btn btn-primary" type="submit" disabled={!file || uploading}>
        {uploading ? 'Importing…' : 'Import workbook'}
      </button>
    </div>
  </form>

  {#if templateError}
    <p class="inline-error" role="alert">{templateError}</p>
  {/if}
  {#if error}
    <p class="inline-error" role="alert">{error}</p>
  {/if}

  {#if result}
    <section class="card result-card" aria-labelledby="import-result">
      <div class="result-head">
        <h2 id="import-result">Import result</h2>
        <p class="result-line" role="status">
          {result.created} created · {result.updated} updated · {result.failed} not imported ·
          {result.skipped} blank lines
        </p>
      </div>

      {#if result.rows.length === 0}
        <p class="empty-line">That workbook contains no activity rows.</p>
      {:else}
        <div class="table-scroll result-scroll">
          <table class="data-table result-table">
            <caption class="sr-only">Rows read from the uploaded workbook</caption>
            <thead>
              <tr>
                <th scope="col">Sheet</th>
                <th scope="col">Row</th>
                <th scope="col">Tracking number</th>
                <th scope="col">Title</th>
                <th scope="col">Result</th>
                <th scope="col">Issues</th>
              </tr>
            </thead>
            <tbody>
              {#each result.rows as row (`${row.sheetName}-${row.rowNumber}`)}
                <tr>
                  <td>{row.sheetName}</td>
                  <td class="num">{row.rowNumber}</td>
                  <td class="mono">{row.trackingNumber || '—'}</td>
                  <td>{row.title || '—'}</td>
                  <td>
                    <span class="action action-{row.action}">{ACTION_LABELS[row.action]}</span>
                  </td>
                  <td class="issues">{row.issues.join(' ') || '—'}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </section>
  {/if}

  <p class="exports-link">
    Need to check the result? <a href="/exports">Open monitoring exports</a>.
  </p>
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
    max-width: 80ch;
  }

  .import-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 16px;
  }

  .actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }

  .loading {
    color: var(--text-secondary);
    font-size: 13px;
  }

  .inline-error {
    background: var(--status-danger-bg);
    border: 1px solid var(--status-danger-fg);
    border-radius: var(--radius-card);
    color: var(--status-danger-fg);
    font-size: 13px;
    margin: 12px 0 0;
    padding: 8px 12px;
  }

  .result-card {
    margin-top: 16px;
    overflow: hidden;
  }

  .result-head {
    border-bottom: 1px solid var(--border);
    padding: 12px 16px;
  }

  .result-head h2 {
    font-size: 16px;
    margin: 0;
  }

  .result-line {
    color: var(--text-secondary);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    margin: 4px 0 0;
  }

  .result-scroll {
    border: 0;
    border-radius: 0;
    max-height: 520px;
  }

  .result-table {
    font-size: 12px;
  }

  .result-table :global(tbody tr) {
    cursor: default;
  }

  .issues {
    max-width: 380px;
    white-space: normal;
  }

  .action {
    border-radius: var(--radius-badge);
    display: inline-block;
    font-size: 11px;
    font-weight: 500;
    padding: 2px 6px;
  }

  .action-created {
    background: var(--status-success-bg);
    color: var(--status-success-fg);
  }

  .action-updated {
    background: var(--status-info-bg);
    color: var(--status-info-fg);
  }

  .action-failed {
    background: var(--status-danger-bg);
    color: var(--status-danger-fg);
  }

  .empty-line {
    color: var(--text-secondary);
    font-size: 13px;
    margin: 0;
    padding: 16px;
  }

  .exports-link {
    color: var(--text-secondary);
    font-size: 12px;
    margin-top: 16px;
  }
</style>
