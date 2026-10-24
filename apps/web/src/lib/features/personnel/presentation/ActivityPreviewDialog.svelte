<script lang="ts">
  import type { ReportDetail } from '@par/shared';
  import { AlertCircle, X } from '@lucide/svelte';
  import { onMount } from 'svelte';

  import { trapFocus } from '$lib/a11y/focus-trap';
  import { api } from '$lib/api/client';
  import StatusBadge from '$lib/components/StatusBadge.svelte';

  import {
    EMPTY_PREVIEW_NAMES,
    previewAction,
    previewGroups,
    previewNamesFor,
    type PreviewNames,
  } from '../application/activity-preview';

  /**
   * The activity a personnel in charge picked, shown before the record opens
   * (report 4). The register row only carries a summary, so the full record is
   * read here, and the dialog's one action either starts the narrative or opens
   * the record read-only. The parent mounts this only for a picked activity, so
   * a closed dialog is never in the page at all.
   */
  let {
    recordId,
    onclose,
  }: {
    recordId: string;
    onclose: () => void;
  } = $props();

  const titleId = $props.id();

  let dialog = $state<HTMLDialogElement | null>(null);
  let detail = $state<ReportDetail | null>(null);
  let names = $state<PreviewNames>(EMPTY_PREVIEW_NAMES);
  let loading = $state(true);
  let failed = $state(false);

  const action = $derived(detail ? previewAction(detail) : null);
  const groups = $derived(detail ? previewGroups(detail, names) : []);

  $effect(() => {
    if (dialog && !dialog.open) dialog.showModal();
  });

  async function load(): Promise<void> {
    loading = true;
    failed = false;
    detail = null;

    try {
      const record = await api.reports.get(recordId);
      detail = record;
      await loadNames(record);
    } catch {
      failed = true;
    } finally {
      loading = false;
    }
  }

  /** Campus, unit, and SDG names live in reference data; the record carries ids. */
  async function loadNames(record: ReportDetail): Promise<void> {
    try {
      const [campuses, units, sdgs] = await Promise.all([
        api.reference.list('campuses'),
        api.reference.list('units'),
        api.reference.list('sdgs'),
      ]);

      names = previewNamesFor(record.form, {
        campuses: campuses.items.map((campus) => ({ id: campus.id, name: campus.name })),
        units: units.items.map((unit) => ({ id: unit.id, name: unit.name })),
        sdgs: sdgs.items.map((sdg) => ({ id: sdg.id, number: sdg.number })),
      });
    } catch {
      // Names are supporting text; the ids still identify the record.
    }
  }

  onMount(() => {
    void load();
  });
</script>

<dialog
  bind:this={dialog}
  class="dialog activity-dialog"
  aria-labelledby={titleId}
  oncancel={(event) => {
    event.preventDefault();
    onclose();
  }}
  onclick={(event) => {
    // A modal click on the backdrop targets the dialog element itself.
    if (event.target === event.currentTarget) onclose();
  }}
  onkeydown={(event) => dialog && trapFocus(event, dialog)}
  {onclose}
>
  <header class="preview-head">
    <div class="identity">
      {#if detail}
        <StatusBadge status={detail.status} />
        <h2 id={titleId}>{detail.referenceNo}</h2>
        <p class="activity-title">{detail.form.title}</p>
      {:else}
        <h2 id={titleId}>Activity preview</h2>
        <p class="activity-title">Opening the registered activity…</p>
      {/if}
    </div>

    <button class="icon-close" type="button" aria-label="Close preview" onclick={onclose}>
      <X size={18} aria-hidden="true" />
    </button>
  </header>

  {#if loading}
    <div class="preview-body loading" role="status">
      <div class="skeleton line wide"></div>
      <div class="skeleton line"></div>
      <div class="skeleton line short"></div>
      <span class="visually-hidden">Loading the activity</span>
    </div>
  {:else if failed || !detail}
    <div class="preview-body preview-failure" role="alert">
      <AlertCircle size={20} aria-hidden="true" />
      <p class="failure-title">We could not open this activity</p>
      <p class="failure-copy">The request did not complete. Try again.</p>
      <button class="btn btn-outline btn-sm" type="button" onclick={() => void load()}>
        Retry
      </button>
    </div>
  {:else}
    <div class="preview-body">
      {#each groups as group (group.title)}
        <section class="fact-group" aria-labelledby={`${titleId}-${group.title}`}>
          <h3 id={`${titleId}-${group.title}`}>{group.title}</h3>
          <table class="facts">
            <caption class="visually-hidden">{group.title} details</caption>
            <tbody>
              {#each group.facts as fact (fact.label)}
                <tr>
                  <th scope="row">{fact.label}</th>
                  <td>{fact.value}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </section>
      {/each}
    </div>

    {#if action}
      <footer class="preview-actions">
        <button class="btn btn-outline" type="button" onclick={onclose}>Close</button>
        <a class="btn btn-primary" href={action.href} onclick={onclose}>{action.label}</a>
      </footer>
    {/if}
  {/if}
</dialog>

<style>
  /* An author `display` beats the UA's `dialog:not([open]) { display: none }`. */
  .activity-dialog:not([open]) {
    display: none;
  }

  .activity-dialog {
    display: flex;
    flex-direction: column;
    max-height: calc(100dvh - 48px);
    max-width: 760px;
    overflow: hidden;
    padding: 0;
    width: min(92vw, 760px);
  }

  .preview-head {
    align-items: flex-start;
    border-bottom: 1px solid var(--border);
    display: flex;
    gap: 16px;
    justify-content: space-between;
    padding: 20px 24px;
  }

  .identity {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .identity h2 {
    font-family: var(--font-mono);
    font-size: 14px;
    letter-spacing: 0.01em;
    margin: 4px 0 0;
  }

  .activity-title {
    color: var(--text-secondary);
    font-size: 13px;
    margin: 0;
    overflow-wrap: anywhere;
  }

  .icon-close {
    align-items: center;
    background: transparent;
    border-radius: var(--radius-card);
    color: var(--text-secondary);
    display: inline-flex;
    flex: none;
    height: 32px;
    justify-content: center;
    transition:
      background-color var(--duration-fast) ease,
      transform 100ms ease-out;
    width: 32px;
  }

  .icon-close:hover {
    background: var(--surface-page);
    color: var(--text-primary);
  }

  .icon-close:active {
    transform: scale(0.94);
  }

  .preview-body {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 20px;
    min-height: 0;
    overflow: auto;
    padding: 18px 24px 20px;
  }

  .fact-group h3 {
    color: var(--text-secondary);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.06em;
    margin: 0 0 6px;
    text-transform: uppercase;
  }

  .facts {
    border-collapse: collapse;
    font-size: 13px;
    width: 100%;
  }

  .facts th,
  .facts td {
    border-bottom: 1px solid var(--border);
    padding: 7px 0;
    text-align: left;
    vertical-align: top;
  }

  .facts tr:last-child th,
  .facts tr:last-child td {
    border-bottom: 0;
  }

  .facts th {
    color: var(--text-secondary);
    font-size: 12px;
    font-weight: 400;
    padding-right: 20px;
    width: 170px;
  }

  .facts td {
    overflow-wrap: anywhere;
  }

  .preview-actions {
    align-items: center;
    border-top: 1px solid var(--border);
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    padding: 14px 24px;
  }

  .loading {
    gap: 12px;
  }

  .skeleton {
    animation: pulse 1.4s ease-in-out infinite;
    background: var(--surface-page);
    border-radius: 4px;
    height: 14px;
  }

  .skeleton.line {
    width: 72%;
  }

  .skeleton.line.wide {
    width: 92%;
  }

  .skeleton.line.short {
    width: 46%;
  }

  .preview-failure {
    align-items: flex-start;
    color: var(--text-secondary);
    gap: 6px;
  }

  .preview-failure > :global(svg) {
    color: var(--status-danger-fg);
  }

  .failure-title {
    color: var(--text-primary);
    font-size: 14px;
    margin: 0;
  }

  .failure-copy {
    font-size: 13px;
    margin: 0 0 8px;
  }

  .visually-hidden {
    clip: rect(0 0 0 0);
    clip-path: inset(50%);
    height: 1px;
    overflow: hidden;
    position: absolute;
    white-space: nowrap;
    width: 1px;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 0.55;
    }
    50% {
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .skeleton {
      animation: none;
    }

    .icon-close {
      transition: none;
    }
  }
</style>
