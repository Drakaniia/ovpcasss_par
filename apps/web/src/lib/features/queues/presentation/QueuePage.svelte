<script lang="ts">
  import type { QueueKind, ReportDetail } from '@par/shared';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { onMount, untrack } from 'svelte';

  import EmptyState from '$lib/components/EmptyState.svelte';
  import ErrorState from '$lib/components/ErrorState.svelte';
  import SkeletonTable from '$lib/components/SkeletonTable.svelte';
  import ApprovalActions from '$lib/features/approval/presentation/ApprovalActions.svelte';
  import ReviewActions from '$lib/features/review/presentation/ReviewActions.svelte';

  import { DecisionController } from '../application/decision-controller.svelte';
  import { decisionSubjectFromItem } from '../application/queue-decisions';
  import {
    clearedQueueFilters,
    hasQueueFilters,
    queueFiltersEqual,
    queueFiltersFromParams,
    queueFiltersToParams,
    queueHref,
    queuePath,
    queueQueryFor,
    updateQueueFilters,
    type QueueFilters,
  } from '../application/queue-filters';
  import { queueEmptyState, queueRowFromItem, type QueueRow } from '../application/queue-rows';
  import { QueueState } from '../application/queue-state.svelte';
  import DecisionDrawer from './DecisionDrawer.svelte';
  import QueueFilterBar from './QueueFilterBar.svelte';
  import QueueHeader from './QueueHeader.svelte';
  import QueuePagination from './QueuePagination.svelte';
  import QueuePreview from './QueuePreview.svelte';
  import QueueTable from './QueueTable.svelte';

  /**
   * Review and approval share one template (UI spec §7.9). Below 1440 px a row
   * opens the detail route; at ≥1440 px it fills the preview pane beside the
   * backlog, and a decision there removes the row without a page reload.
   */
  let { kind }: { kind: QueueKind } = $props();

  const queue = untrack(() => new QueueState(kind));
  let filters = $state(untrack(() => queueFiltersFromParams(new URLSearchParams(page.url.search))));
  let now = $state(new Date());

  const controller = untrack(
    () =>
      new DecisionController({
        ondecided: (detail: ReportDetail) => focusAfter(queue.rowDecided(detail.id)),
        onstale: () => void queue.reload(queueQueryFor(filters)),
      }),
  );

  const search = $derived(queueFiltersToParams(filters));

  const rows = $derived(queue.items.map((item) => queueRowFromItem(item, { kind, now, search })));
  const selectedItem = $derived(queue.items.find((item) => item.id === queue.selectedId) ?? null);
  const selectedRow = $derived(
    selectedItem ? queueRowFromItem(selectedItem, { kind, now, search }) : null,
  );
  const empty = $derived(
    queueEmptyState(kind, {
      hasFilters: hasQueueFilters(filters),
      filteredHref: queueHref(queuePath(kind), clearedQueueFilters(filters)),
      repositoryHref: '/search',
    }),
  );
  const queueRolePlural = $derived(queue.requiredRole === 'REVIEWER' ? 'reviewers' : 'approvers');

  function focusAfter(id: string | null) {
    if (!id) return;
    requestAnimationFrame(() => document.getElementById(`queue-row-${id}`)?.focus());
  }

  async function applyFilters(patch: Partial<QueueFilters>) {
    const next = updateQueueFilters(filters, patch);
    if (queueFiltersEqual(next, filters)) return;

    filters = next;
    await goto(queueHref(queuePath(kind), next), { replaceState: true });
  }

  /** Row click; the pane only exists at the master–detail width. */
  function openRow(row: QueueRow) {
    if (window.matchMedia('(min-width: 1440px)').matches) {
      void queue.select(row.id);
      return;
    }

    void goto(row.href);
  }

  onMount(() => void queue.load());

  // Back/forward or a shared link replaces the local filter state.
  $effect(() => {
    const fromUrl = queueFiltersFromParams(new URLSearchParams(page.url.search));
    if (
      !queueFiltersEqual(
        fromUrl,
        untrack(() => filters),
      )
    )
      filters = fromUrl;
  });

  $effect(() => {
    if (queue.view !== 'ready') return;

    const query = queueQueryFor(filters);
    void queue.reload(query).then((target) => {
      if (target === null) {
        now = new Date();
        return;
      }
      void applyFilters({ page: target });
    });
  });
</script>

<svelte:head>
  <title>{kind === 'review' ? 'Review queue' : 'Approval queue'} · OVPCASSS Paperless PAR</title>
</svelte:head>

{#if queue.view === 'denied'}
  <ErrorState
    variant="permission"
    title="You do not have access to this queue"
    description="Only {queueRolePlural} see this queue. Contact the OVPCASSS administrator if you believe this is a mistake."
    backHref="/"
    backLabel="Back to inbox"
  />
{:else if queue.view === 'error'}
  <ErrorState
    title="We could not load your account"
    description="The request did not complete. Try again, or return to your inbox."
    onretry={() => void queue.load()}
    backHref="/"
    backLabel="Back to inbox"
  />
{:else if queue.view === 'ready'}
  <QueueHeader {kind} total={queue.total} oldestAgeDays={queue.oldestAgeDays} />

  <QueueFilterBar {filters} facets={queue.facets} onchange={(patch) => void applyFilters(patch)} />

  <p class="sr-only" role="status">{queue.announcement}</p>

  <div class="queue-layout">
    <div class="queue-list">
      {#if queue.loadFailed}
        <div class="table-state">
          <ErrorState
            title="We could not load this queue"
            description="The list did not load. Try again; your filters are kept."
            requestId={queue.requestId}
            onretry={() => void queue.reload(queueQueryFor(filters))}
            backHref="/"
            backLabel="Back to inbox"
          />
        </div>
      {:else if queue.loading}
        <SkeletonTable rows={8} widths={[18, 28, 14, 16, 12, 12, 14]} />
      {:else if rows.length === 0}
        <div class="table-state">
          <EmptyState
            title={empty.title}
            description={empty.description}
            action={empty.action}
            actionVariant="outline"
          />
        </div>
      {:else}
        <QueueTable
          {rows}
          {kind}
          selectedId={queue.selectedId}
          leavingId={queue.leavingId}
          onrow={openRow}
        />

        <QueuePagination
          total={queue.total}
          page={filters.page}
          pageSize={25}
          onpage={(next) => void applyFilters({ page: next })}
        />
      {/if}
    </div>

    <QueuePreview
      {kind}
      row={selectedRow}
      preview={queue.preview}
      references={queue.references}
      onretry={() => void queue.reloadPreview()}
    >
      {#snippet actions()}
        {#if selectedItem}
          {#if kind === 'review'}
            <ReviewActions subject={decisionSubjectFromItem(selectedItem, 'review')} {controller} />
          {:else}
            <ApprovalActions
              subject={decisionSubjectFromItem(selectedItem, 'approval')}
              {controller}
            />
          {/if}
        {/if}
      {/snippet}
    </QueuePreview>
  </div>
{/if}

<DecisionDrawer {controller} />

<style>
  .queue-layout {
    align-items: start;
    display: grid;
    gap: 24px;
    grid-template-columns: minmax(0, 1fr);
  }

  /* Master–detail appears only when there is room for both (UI spec §12). */
  @media (min-width: 1440px) {
    .queue-layout {
      grid-template-columns: minmax(0, 1.15fr) minmax(360px, 1fr);
    }
  }

  .queue-list {
    min-width: 0;
  }

  .table-state {
    background: var(--surface-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
  }

  .sr-only {
    clip: rect(0 0 0 0);
    clip-path: inset(50%);
    height: 1px;
    overflow: hidden;
    position: absolute;
    white-space: nowrap;
    width: 1px;
  }
</style>
