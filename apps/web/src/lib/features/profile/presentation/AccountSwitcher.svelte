<script lang="ts">
  import type { SavedAccount } from '$lib/platform/contracts';
  import { LogIn, LoaderCircle, UserRoundPlus } from '@lucide/svelte';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  import { setSessionToken } from '$lib/api/http';
  import { isTauri } from '$lib/platform';
  import {
    forgetAccount,
    savedAccounts,
    switchToAccount,
  } from '$lib/platform/session-token';
  import { clearSession, loadSession, signOut } from '$lib/session/session.svelte';
  import { toast } from '$lib/toast/toast.svelte';

  import { loginHref, switchStep } from '../application/account-switcher';

  /**
   * Saved accounts on this device (report 5). The desktop shell holds one token
   * per account in the OS credential store, so switching is instant. The browser
   * has one HttpOnly cookie, so switching signs out and carries the address to
   * the sign-in form instead of pretending a second session exists.
   */
  let accounts = $state<SavedAccount[]>([]);
  let loading = $state(true);
  let failed = $state(false);
  let busy = $state<string | null>(null);

  const desktop = isTauri();

  async function load(): Promise<void> {
    loading = true;
    failed = false;
    try {
      accounts = await savedAccounts();
    } catch {
      failed = true;
    } finally {
      loading = false;
    }
  }

  async function choose(account: SavedAccount): Promise<void> {
    if (busy || account.active) return;
    busy = account.id;

    try {
      const outcome = await switchToAccount(account.id);
      const step = switchStep(desktop ? 'desktop' : 'web', outcome);

      if (step === 'restore') {
        clearSession();
        const user = await loadSession(true);
        if (user) {
          await goto('/');
          return;
        }

        setSessionToken(null);
        await forgetAccount(account.id);
        toast.error('That saved session has expired. Sign in again.');
        await load();
        return;
      }

      if (step === 'sign-in') {
        await signOut();
        await goto(loginHref(account.email));
        return;
      }

      setSessionToken(null);
      await forgetAccount(account.id);
      toast.error('That saved session has expired. Sign in again.');
      await load();
    } finally {
      busy = null;
    }
  }

  async function add(): Promise<void> {
    if (busy) return;
    busy = 'add';
    try {
      await signOut();
      await goto('/login');
    } finally {
      busy = null;
    }
  }

  async function forget(account: SavedAccount): Promise<void> {
    if (busy) return;
    busy = account.id;
    try {
      await forgetAccount(account.id);
      await load();
      toast.success('Account removed from this device.');
    } finally {
      busy = null;
    }
  }

  onMount(() => {
    void load();
  });
</script>

<section class="card card-body" aria-labelledby="accounts-heading">
  <div class="card-head">
    <h2 id="accounts-heading">Accounts</h2>
    <p class="card-copy">
      {#if desktop}
        Accounts saved on this device. Choosing one signs in without a password.
      {:else}
        A browser session is one account at a time. Switching returns you to sign in with the
        address ready.
      {/if}
    </p>
  </div>

  {#if loading}
    <div class="rows" aria-hidden="true">
      <div class="skeleton" style="height: 40px; width: 100%"></div>
      <div class="skeleton" style="height: 40px; width: 100%"></div>
    </div>
    <p class="visually-hidden" role="status">Loading saved accounts…</p>
  {:else if failed}
    <p class="note">
      The saved accounts could not be read.
      <button class="btn btn-ghost btn-sm inline" type="button" onclick={() => void load()}>
        Retry
      </button>
    </p>
  {:else}
    {#if accounts.length === 0}
      <p class="note">No other accounts are saved on this device.</p>
    {:else}
      <ul class="accounts">
        {#each accounts as account (account.id)}
          <li class="account" class:is-active={account.active}>
            <div class="identity">
              <span class="name">{account.name || account.email}</span>
              {#if account.email}
                <span class="email">{account.email}</span>
              {/if}
            </div>

            {#if account.active}
              <span class="current">Signed in</span>
            {:else}
              <div class="row-actions">
                <button
                  class="btn btn-outline btn-sm"
                  type="button"
                  disabled={busy !== null}
                  aria-label={`Switch to ${account.email || account.name}`}
                  onclick={() => void choose(account)}
                >
                  {#if busy === account.id}
                    <LoaderCircle class="spin" size={14} aria-hidden="true" />
                    Switching…
                  {:else}
                    <LogIn size={14} aria-hidden="true" />
                    Switch
                  {/if}
                </button>
                <button
                  class="btn btn-ghost btn-sm forget"
                  type="button"
                  disabled={busy !== null}
                  aria-label={`Forget ${account.email || account.name} on this device`}
                  onclick={() => void forget(account)}
                >
                  Forget
                </button>
              </div>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}

    <div class="card-actions">
      <button
        class="btn btn-outline btn-sm"
        type="button"
        disabled={busy !== null}
        onclick={() => void add()}
      >
        <UserRoundPlus size={15} aria-hidden="true" />
        Add another account
      </button>
    </div>
  {/if}
</section>

<style>
  .card-body {
    padding: 24px;
  }

  .card-head {
    margin-bottom: 20px;
  }

  .card-head h2 {
    margin: 0;
  }

  .card-copy {
    color: var(--text-secondary);
    font-size: 13px;
    margin: 4px 0 0;
  }

  .rows,
  .accounts {
    display: flex;
    flex-direction: column;
    gap: 10px;
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .account {
    align-items: center;
    border-bottom: 1px solid var(--border);
    display: flex;
    gap: 16px;
    justify-content: space-between;
    padding-bottom: 10px;
  }

  .account:last-child {
    border-bottom: 0;
    padding-bottom: 0;
  }

  .identity {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .name {
    font-size: 13px;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .email {
    color: var(--text-secondary);
    font-size: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .current {
    background: var(--surface-page);
    border: 1px solid var(--border);
    border-radius: 999px;
    color: var(--text-secondary);
    flex: none;
    font-size: 11px;
    padding: 2px 8px;
  }

  .row-actions {
    align-items: center;
    display: flex;
    flex: none;
    gap: 4px;
  }

  .row-actions .btn {
    align-items: center;
    display: inline-flex;
    gap: 6px;
  }

  .forget {
    color: var(--text-secondary);
  }

  .card-actions {
    border-top: 1px solid var(--border);
    margin-top: 14px;
    padding-top: 12px;
  }

  .card-actions .btn {
    align-items: center;
    display: inline-flex;
    gap: 6px;
  }

  .note {
    color: var(--text-secondary);
    font-size: 13px;
    margin: 0;
  }

  .inline {
    margin-left: 4px;
    padding: 0 4px;
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
