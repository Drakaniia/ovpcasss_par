<script lang="ts">
  import type { InboxResponse, MyReceipt, ReportListResponse, ReportPageSize } from '@par/shared';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { onMount, untrack } from 'svelte';

  import { api } from '$lib/api/client';
  import { ApiError } from '$lib/api/http';
  import ErrorState from '$lib/components/ErrorState.svelte';
  import { destinationAfterSignIn } from '$lib/features/auth/application/post-sign-in';
  import InboxPageHeader from '$lib/features/inbox/presentation/InboxPageHeader.svelte';
  import InboxSkeleton from '$lib/features/inbox/presentation/InboxSkeleton.svelte';
  import WorkInbox from '$lib/features/inbox/presentation/WorkInbox.svelte';
  import { setHomeInboxStatus } from '$lib/features/onboarding/application/tour-controller.svelte';
  import {
    DEFAULT_PERSONNEL_FILTERS,
    personnelFiltersFromParams,
    personnelFiltersToParams,
    personnelFiltersToQuery,
    updatePersonnelFilters,
    type PersonnelFilters,
  } from '$lib/features/personnel/application/personnel-records';
  import PersonnelRecords from '$lib/features/personnel/presentation/PersonnelRecords.svelte';
  import ReceiptHistory from '$lib/features/receipts/presentation/ReceiptHistory.svelte';
  import { clearSession, loadSession, session, signOut } from '$lib/session/session.svelte';
  import { toast } from '$lib/toast/toast.svelte';

  let loaded = $state(false);
  let inbox = $state<InboxResponse | null>(null);
  let records = $state<ReportListResponse | null>(null);
  let receipts = $state<MyReceipt[]>([]);
  let filters = $state<PersonnelFilters>(
    untrack(() => personnelFiltersFromParams(new URLSearchParams(page.url.search))),
  );
  let failure = $state<{ requestId?: string } | null>(null);
  let requestId = 0;

  const user = $derived(session.user);
  const roles = $derived(user?.role ? [user.role] : []);
  const personnel = $derived(user?.role === 'PERSONNEL');

  /** The server already scoped the register to this account's membership. */
  async function fetchRecords(target: PersonnelFilters): Promise<ReportListResponse> {
    let list = await api.reports.list(personnelFiltersToQuery(target));
    const pages = Math.max(1, Math.ceil(list.total / list.size));

    if (target.page > pages) {
      const clamped = { ...target, page: pages };
      filters = clamped;
      void goto(`/?${personnelFiltersToParams(clamped)}`, {
        replace: true,
        reset: false,
      }).catch(() => {});
      list = await api.reports.list(personnelFiltersToQuery(clamped));
    }

    return list;
  }

  async function load() {
    loaded = false;
    failure = null;
    // Nothing opens on the skeleton; the tour waits for a painted inbox.
    setHomeInboxStatus('idle');

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

      if (account.role === 'PERSONNEL') {
        const [list, mine] = await Promise.all([
          fetchRecords(untrack(() => filters)),
          api.receipts.mine(),
        ]);
        records = list;
        receipts = mine.items;
      } else {
        inbox = await api.inbox.get();
      }

      setHomeInboxStatus('ready');
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        clearSession();
        await goto('/login', { replaceState: true });
        return;
      }

      failure = { requestId: error instanceof ApiError ? error.requestId : undefined };
      // Stay armed: the next successful Home load may open the tour.
      setHomeInboxStatus('failed');
    } finally {
      loaded = true;
    }
  }

  /**
   * The list follows the filters, never the navigation: the URL is written for
   * sharing and Back, but a stalled or aborted route update must not leave the
   * table showing the previous scope with no error.
   */
  async function applyFilters(patch: Partial<PersonnelFilters>): Promise<void> {
    const next = updatePersonnelFilters(filters, patch);
    if (personnelFiltersToParams(next) === personnelFiltersToParams(filters)) return;

    filters = next;
    void goto(`/?${personnelFiltersToParams(next)}`, {
      replace: true,
      reset: false,
    }).catch(() => {});

    const token = ++requestId;
    try {
      const list = await fetchRecords(next);
      if (token === requestId) records = list;
    } catch (error) {
      if (token !== requestId) return;

      if (error instanceof ApiError && error.status === 401) {
        clearSession();
        await goto('/login', { replaceState: true });
        return;
      }

      toast.error('That filter did not apply. Try again.');
    }
  }

  function clearFilters(): void {
    void applyFilters({
      ...DEFAULT_PERSONNEL_FILTERS,
      pageSize: filters.pageSize,
    });
  }

  onMount(() => {
    void load();

    return () => setHomeInboxStatus('idle');
  });
</script>

<svelte:head><title>Home · OVPCASSS Paperless PAR</title></svelte:head>

{#if failure}
  {#if user}
    <InboxPageHeader {user} {roles} showPrimary={false} />
  {/if}
  <ErrorState
    title="We could not load your home"
    description="The request did not complete. Try again."
    requestId={failure.requestId}
    onretry={() => void load()}
  />
{:else if loaded && user && personnel && records}
  <InboxPageHeader {user} {roles} />
  <div class="personnel-home">
    <PersonnelRecords
      {records}
      {filters}
      {receipts}
      onchange={(patch) => void applyFilters(patch)}
      onpage={(next) => void applyFilters({ page: next })}
      onpagesize={(size: ReportPageSize) => void applyFilters({ pageSize: size })}
      onclear={clearFilters}
    />
    <ReceiptHistory {receipts} />
  </div>
{:else if loaded && inbox && user}
  <InboxPageHeader {user} {roles} />
  <WorkInbox {inbox} {roles} onrefresh={() => void load()} />
{:else}
  {#if user}
    <InboxPageHeader {user} {roles} />
  {/if}
  <InboxSkeleton showHead={!user} />
{/if}

<style>
  .personnel-home {
    display: flex;
    flex-direction: column;
    gap: 28px;
  }
</style>
