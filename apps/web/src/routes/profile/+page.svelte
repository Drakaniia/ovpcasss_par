<script lang="ts">
  import { AlertCircle } from '@lucide/svelte';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  import { destinationAfterSignIn } from '$lib/features/auth/application/post-sign-in';
  import AccountCard from '$lib/features/profile/presentation/AccountCard.svelte';
  import EmailPreferences from '$lib/features/profile/presentation/EmailPreferences.svelte';
  import PasswordCard from '$lib/features/profile/presentation/PasswordCard.svelte';
  import SignatureUpload from '$lib/features/profile/presentation/SignatureUpload.svelte';
  import UpdateCard from '$lib/features/updater/presentation/UpdateCard.svelte';
  import { loadSession, session, signOut } from '$lib/session/session.svelte';

  let loading = $state(true);
  let loadFailed = $state(false);

  const user = $derived(session.user);

  async function load(force = false) {
    loading = true;
    loadFailed = false;

    try {
      const account = await loadSession(force);

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
      }
    } catch {
      loadFailed = true;
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    void load();
  });
</script>

<svelte:head><title>Profile · OVPCASSS Paperless PAR</title></svelte:head>

<div class="profile">
  <header class="page-head">
    <h1>Profile</h1>
    <p>Account details, password, and email preferences.</p>
  </header>

  {#if loading}
    <div class="grid" aria-hidden="true">
      {#each [1, 2] as card (card)}
        <div class="card skeleton-card">
          <div class="skeleton" style="height: 18px; width: 32%"></div>
          <div class="skeleton" style="height: 32px; width: 100%"></div>
          <div class="skeleton" style="height: 32px; width: 100%"></div>
          <div class="skeleton" style="height: 32px; width: 100%"></div>
          <div class="skeleton" style="height: 36px; margin-left: auto; width: 96px"></div>
        </div>
      {/each}
    </div>
    <p class="visually-hidden" role="status">Loading profile…</p>
  {:else if loadFailed}
    <div class="card load-error" role="alert">
      <p class="load-error-title">
        <AlertCircle size={18} aria-hidden="true" />
        We could not load your profile
      </p>
      <p class="load-error-copy">
        The request did not complete. Check your connection and try again.
      </p>
      <button class="btn btn-primary" type="button" onclick={() => void load(true)}>Retry</button>
    </div>
  {:else if user}
    <div class="grid">
      <AccountCard {user} />
      <PasswordCard hasPassword={user.hasPassword ?? true} />
      <EmailPreferences />
      <UpdateCard />
      {#if user.role === 'APPROVER'}
        <div class="signature-slot">
          <SignatureUpload />
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .profile {
    max-width: 1040px;
  }

  .page-head {
    margin-bottom: 20px;
  }

  .page-head h1 {
    margin: 0;
  }

  .page-head p {
    color: var(--text-secondary);
    font-size: 13px;
    margin: 4px 0 0;
  }

  .grid {
    align-items: start;
    display: grid;
    gap: 24px;
    grid-template-columns: minmax(0, 1fr);
  }

  @media (min-width: 1024px) {
    .grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    /* The approver's signature card owns the full width for its 600 px canvas. */
    .signature-slot {
      grid-column: 1 / -1;
    }
  }

  .skeleton-card {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 24px;
  }

  .load-error {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 32px;
  }

  .load-error-title {
    align-items: center;
    display: flex;
    font-weight: 600;
    gap: 8px;
    margin: 0;
  }

  .load-error-copy {
    color: var(--text-secondary);
    margin: 0;
  }

  .load-error .btn {
    align-self: flex-start;
    margin-top: 8px;
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
</style>
