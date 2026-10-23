<script lang="ts">
  import type { InboxResponse } from '@par/shared';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  import { api } from '$lib/api/client';
  import { ApiError } from '$lib/api/http';
  import ErrorState from '$lib/components/ErrorState.svelte';
  import { destinationAfterSignIn } from '$lib/features/auth/application/post-sign-in';
  import { setHomeInboxStatus } from '$lib/features/onboarding/application/tour-controller.svelte';
  import InboxPageHeader from '$lib/features/inbox/presentation/InboxPageHeader.svelte';
  import InboxSkeleton from '$lib/features/inbox/presentation/InboxSkeleton.svelte';
  import WorkInbox from '$lib/features/inbox/presentation/WorkInbox.svelte';
  import { clearSession, loadSession, session, signOut } from '$lib/session/session.svelte';

  let loaded = $state(false);
  let inbox = $state<InboxResponse | null>(null);
  let failure = $state<{ requestId?: string } | null>(null);

  const user = $derived(session.user);
  const roles = $derived(user?.role ? [user.role] : []);

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

      inbox = await api.inbox.get();
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

  onMount(() => {
    void load();

    return () => setHomeInboxStatus('idle');
  });
</script>

<svelte:head><title>Work inbox · OVPCASSS Paperless PAR</title></svelte:head>

{#if failure}
  {#if user}
    <InboxPageHeader {user} {roles} showPrimary={false} />
  {/if}
  <ErrorState
    title="We could not load your work inbox"
    description="The request did not complete. Try again, or return to the reports list."
    requestId={failure.requestId}
    onretry={() => void load()}
  />
{:else if loaded && inbox && user}
  <InboxPageHeader {user} {roles} />
  <WorkInbox {inbox} {roles} onrefresh={() => void load()} />
{:else}
  {#if user}
    <InboxPageHeader {user} {roles} />
  {/if}
  <InboxSkeleton showHead={!user} />
{/if}
