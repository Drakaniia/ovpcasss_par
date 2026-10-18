<script lang="ts">
  import type { ReferenceEntityKey, ReferenceEntry } from '@par/shared';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { onMount, tick, untrack } from 'svelte';

  import { api } from '$lib/api/client';
  import { ApiError } from '$lib/api/http';
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import ErrorState from '$lib/components/ErrorState.svelte';
  import SkeletonTable from '$lib/components/SkeletonTable.svelte';
  import { destinationAfterSignIn } from '$lib/features/auth/application/post-sign-in';
  import { loadSession, signOut } from '$lib/session/session.svelte';
  import { toast } from '$lib/toast/toast.svelte';

  import {
    configFor,
    deactivationFor,
    draftForCreate,
    draftFromRow,
    entityFromParams,
    paramsForView,
    rowsFromEntries,
    showInactiveFromParams,
    visibleRows,
  } from '../application/reference-data';
  import type {
    ReferenceDraft,
    ReferenceRelated,
    ReferenceRow,
  } from '../application/reference-types';
  import ReferenceDataHeader from './ReferenceDataHeader.svelte';
  import ReferenceDataTable from './ReferenceDataTable.svelte';
  import ReferenceDataTabs from './ReferenceDataTabs.svelte';
  import ReferenceEntryDrawer from './ReferenceEntryDrawer.svelte';

  type AuthState = 'loading' | 'ready' | 'denied' | 'error';

  let auth = $state<AuthState>('loading');
  let entity = $state<ReferenceEntityKey>(
    untrack(() => entityFromParams(new URLSearchParams(page.url.search))),
  );
  let showInactive = $state(
    untrack(() => showInactiveFromParams(new URLSearchParams(page.url.search))),
  );
  let entries = $state<ReferenceEntry[]>([]);
  let related = $state<ReferenceRelated>({});
  let loading = $state(true);
  let failure = $state<{ requestId?: string } | null>(null);

  let draft = $state<ReferenceDraft | null>(null);
  let drawerKey = $state(0);
  let returnFocus: HTMLElement | null = null;

  let pendingDeactivation = $state<ReferenceRow | null>(null);
  let deactivateOpen = $state(false);

  let requestId = 0;

  const config = $derived(configFor(entity));
  const rows = $derived(rowsFromEntries(config, entries));
  const shown = $derived(visibleRows(config, rows, showInactive));
  const skeletonWidths = $derived([...config.columns([]).map(() => 14), 4]);
  const deactivationCopy = $derived(
    pendingDeactivation ? deactivationFor(config, pendingDeactivation) : null,
  );

  async function loadAccount() {
    auth = 'loading';

    try {
      const account = await loadSession();

      if (!account) {
        await goto('/login', { replaceState: true });
        return;
      }

      if (account.status !== 'ACTIVE') {
        const destination = destinationAfterSignIn(account);
        if (destination) {
          await goto(destination, { replaceState: true });
        } else {
          await signOut();
          await goto('/login', { replaceState: true });
        }
        return;
      }

      auth = account.role === 'ADMIN' ? 'ready' : 'denied';
    } catch {
      auth = 'error';
    }
  }

  async function loadEntries(target: ReferenceEntityKey) {
    const token = ++requestId;
    loading = true;
    failure = null;

    try {
      const result = await api.admin.referenceData.list(target);
      if (token !== requestId) return;
      entries = result.items;
    } catch (error) {
      if (token !== requestId) return;

      if (error instanceof ApiError && error.status === 401) {
        await goto('/login', { replaceState: true });
        return;
      }
      if (error instanceof ApiError && error.status === 403) {
        auth = 'denied';
        return;
      }

      failure = { requestId: error instanceof ApiError ? error.requestId : undefined };
    } finally {
      if (token === requestId) loading = false;
    }
  }

  /** Campus and unit selects resolve their labels from the owning entity. */
  async function loadRelated(target: ReferenceEntityKey) {
    try {
      if (target === 'units') {
        const result = await api.admin.referenceData.list('campuses');
        related = { campuses: rowsFromEntries(configFor('campuses'), result.items) };
      } else if (target === 'programs') {
        const result = await api.admin.referenceData.list('units');
        related = { units: rowsFromEntries(configFor('units'), result.items) };
      } else {
        related = {};
      }
    } catch {
      related = {};
    }
  }

  function updateView(nextEntity: ReferenceEntityKey, nextInactive: boolean) {
    const params = paramsForView(nextEntity, nextInactive);
    void goto(`/admin/reference-data${params ? `?${params}` : ''}`, { replaceState: true });
  }

  function setInactive(next: boolean) {
    showInactive = next;
    updateView(entity, next);
  }

  function openCreate() {
    returnFocus = document.getElementById('reference-add-entry');
    draft = draftForCreate(config, rows);
    drawerKey += 1;
  }

  function openEntry(row: ReferenceRow, element: HTMLElement) {
    returnFocus = element;
    draft = draftFromRow(config, row);
    drawerKey += 1;
  }

  function closeDrawer() {
    const target = returnFocus;
    draft = null;
    void tick().then(() => target?.focus());
  }

  function handleChanged(entry: ReferenceEntry, message: string) {
    toast.success(message);
    closeDrawer();

    entries = entries.some((item) => item.id === entry.id)
      ? entries.map((item) => (item.id === entry.id ? entry : item))
      : [...entries, entry];
  }

  function askDeactivate(row: ReferenceRow) {
    if (row.blockedReason) return;
    pendingDeactivation = row;
    deactivateOpen = true;
  }

  async function confirmDeactivate() {
    const row = pendingDeactivation;
    pendingDeactivation = null;
    if (!row) return;

    try {
      const entry = await api.admin.referenceData.deactivate(config.key, row.id);
      handleChanged(entry, 'Entry deactivated');
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'We could not deactivate this entry. Try again.',
      );
    }
  }

  async function activate(row: ReferenceRow) {
    try {
      const entry = await api.admin.referenceData.activate(config.key, row.id);
      handleChanged(entry, 'Entry activated');
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'We could not activate this entry. Try again.',
      );
    }
  }

  function retry() {
    void loadEntries(entity);
  }

  onMount(() => {
    void loadAccount();
  });

  // Back/forward or a shared link replaces the local tab state.
  $effect(() => {
    const params = new URLSearchParams(page.url.search);
    const nextEntity = entityFromParams(params);
    const nextInactive = showInactiveFromParams(params);

    if (nextEntity !== untrack(() => entity)) {
      entity = nextEntity;
      draft = null;
    }
    if (nextInactive !== untrack(() => showInactive)) showInactive = nextInactive;
  });

  $effect(() => {
    if (auth !== 'ready') return;
    const target = entity;
    void loadEntries(target);
    void loadRelated(target);
  });
</script>

<svelte:head><title>Reference data · OVPCASSS Paperless PAR</title></svelte:head>

{#if auth === 'denied'}
  <ErrorState
    variant="permission"
    requiredRole="ADMIN"
    title="This page requires the Admin role."
    description="Only an administrator can maintain campuses, units, programs, and the other reference lists. Sign in with an administrator account to continue."
    backHref="/"
    backLabel="Back to inbox"
  />
{:else if auth === 'error'}
  <ErrorState
    title="We could not load your account"
    description="The request did not complete. Try again, or return to your inbox."
    onretry={() => void loadAccount()}
    backHref="/"
    backLabel="Back to inbox"
  />
{:else}
  <div class="reference-data">
    <header class="page-head">
      <h1>Reference data</h1>
    </header>

    <ReferenceDataTabs {entity} {showInactive} />

    <section class="entity-panel" aria-labelledby="entity-heading">
      <ReferenceDataHeader
        label={config.label}
        {showInactive}
        disabled={auth !== 'ready' || loading}
        oninactive={setInactive}
        onadd={openCreate}
      />

      <div class="entity-body">
        {#if failure}
          <ErrorState
            title="We could not load this reference data"
            description="The list did not load. Try again, or return to your inbox."
            requestId={failure.requestId}
            onretry={retry}
            backHref="/"
            backLabel="Back to inbox"
          />
        {:else if loading || auth === 'loading'}
          <SkeletonTable rows={8} widths={skeletonWidths} />
        {:else if rows.length === 0}
          <EmptyState
            title="No entries yet."
            description={config.usage}
            action={{ label: 'Add entry', onclick: openCreate }}
            actionVariant="outline"
          />
        {:else if shown.length === 0}
          <EmptyState
            title="No entries match this filter."
            description="Show inactive entries to find deactivated rows."
            action={{ label: 'Show inactive entries', onclick: () => setInactive(true) }}
            actionVariant="outline"
          />
        {:else}
          <ReferenceDataTable
            {config}
            rows={shown}
            selectedId={draft?.id ?? null}
            onopen={openEntry}
            ondeactivate={askDeactivate}
            onactivate={(row) => void activate(row)}
          />
        {/if}
      </div>
    </section>
  </div>

  {#if draft}
    {#key drawerKey}
      <ReferenceEntryDrawer
        {config}
        {draft}
        {rows}
        {related}
        onclose={closeDrawer}
        onchanged={handleChanged}
      />
    {/key}
  {/if}

  {#if deactivationCopy}
    <ConfirmDialog
      bind:open={deactivateOpen}
      title={deactivationCopy.title}
      description={deactivationCopy.description}
      confirmLabel={deactivationCopy.confirmLabel}
      tone="destructive"
      onconfirm={() => void confirmDeactivate()}
      oncancel={() => (pendingDeactivation = null)}
    />
  {/if}
{/if}

<style>
  .page-head {
    margin-bottom: 16px;
  }

  .page-head h1 {
    letter-spacing: -0.01em;
    margin: 0;
  }

  .entity-panel {
    background: var(--surface-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-card);
    overflow: hidden;
  }

  .entity-body {
    border-top: 1px solid var(--border);
  }

  .entity-body :global(.table-scroll) {
    border: 0;
    border-radius: 0;
  }

  .entity-body :global(.empty-state),
  .entity-body :global(.error-state) {
    padding-block: 40px;
  }
</style>
