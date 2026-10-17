<script lang="ts">
  import { Check, LoaderCircle } from '@lucide/svelte';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  import { destinationAfterSignIn } from '$lib/features/auth/application/post-sign-in';
  import { loadSession, session, signOut } from '$lib/session/session.svelte';

  let loading = $state(true);
  let loadFailed = $state(false);
  let checking = $state(false);
  let note = $state<string | null>(null);

  const user = $derived(session.user);

  async function resolve(force: boolean) {
    loadFailed = false;
    note = null;

    try {
      const account = await loadSession(force);

      if (!account) {
        await goto('/login', { replaceState: true });
        return;
      }

      const destination = destinationAfterSignIn(account);
      if (destination === null) {
        note = 'This account is not active. Contact the OVPCASSS administrator.';
        return;
      }
      if (destination !== '/awaiting-approval') {
        await goto(destination, { replaceState: true });
        return;
      }

      if (force) note = 'Your account is still awaiting role assignment.';
    } catch {
      loadFailed = true;
    } finally {
      loading = false;
    }
  }

  async function checkStatus() {
    checking = true;
    await resolve(true);
    checking = false;
  }

  async function signOutAccount() {
    await signOut();
    await goto('/login', { replaceState: true });
  }

  onMount(() => {
    void resolve(false);
  });
</script>

{#if loading}
  <p class="loading" role="status">
    <LoaderCircle class="spin" size={16} aria-hidden="true" />
    Checking your account status…
  </p>
{:else if loadFailed}
  <div class="form-stack">
    <div class="form-alert" role="alert">
      <span>
        <strong>We could not check your account status.</strong>
        Check your connection and try again.
      </span>
    </div>
    <button class="btn btn-primary form-submit" type="button" onclick={() => void checkStatus()}>
      Try again
    </button>
    <button class="btn btn-outline form-submit" type="button" onclick={() => void signOutAccount()}>
      Sign out
    </button>
  </div>
{:else if user}
  <div class="panel">
    <p class="email">
      Signed in as <strong>{user.email}</strong>
    </p>

    <ol class="timeline">
      <li class="step" data-state="done">
        <span class="marker" aria-hidden="true"><Check size={14} /></span>
        <div class="step-text">
          <p class="step-title">Verified</p>
          <p class="step-meta">Email address confirmed</p>
        </div>
        <span class="stage">Completed</span>
      </li>
      <li class="step" data-state="current" aria-current="step">
        <span class="marker" aria-hidden="true">2</span>
        <div class="step-text">
          <p class="step-title">Role assigned</p>
          <p class="step-meta">An administrator assigns your role</p>
        </div>
        <span class="stage">Current stage</span>
      </li>
      <li class="step" data-state="upcoming">
        <span class="marker" aria-hidden="true">3</span>
        <div class="step-text">
          <p class="step-title">Active</p>
          <p class="step-meta">Access to reports and queues</p>
        </div>
        <span class="stage">Upcoming</span>
      </li>
    </ol>

    <p class="copy">
      No action is needed. Reload this page after the administrator assigns your role.
    </p>

    {#if note}
      <p class="field-hint" role="status">{note}</p>
    {/if}

    <button class="btn btn-outline form-submit" type="button" onclick={() => void checkStatus()}>
      {#if checking}
        <LoaderCircle class="spin" size={16} aria-hidden="true" />
        Checking…
      {:else}
        Check status
      {/if}
    </button>
    <button class="btn btn-primary form-submit" type="button" onclick={() => void signOutAccount()}>
      Sign out
    </button>
  </div>
{/if}

<style>
  .panel {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .loading {
    align-items: center;
    color: var(--text-secondary);
    display: flex;
    font-size: 13px;
    gap: 8px;
    justify-content: center;
    margin: 0;
    padding: 12px 0;
  }

  .email {
    color: var(--text-secondary);
    font-size: 13px;
    margin: 0;
    text-align: center;
  }

  .email strong {
    color: var(--text-primary);
    font-weight: 500;
  }

  .timeline {
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    list-style: none;
    margin: 0;
    padding: 4px 12px;
  }

  .step {
    align-items: center;
    display: flex;
    gap: 12px;
    padding: 10px 0;
  }

  .step + .step {
    border-top: 1px solid var(--border);
  }

  .marker {
    align-items: center;
    border: 1px solid var(--border);
    border-radius: 50%;
    color: var(--text-secondary);
    display: inline-flex;
    flex: none;
    font-size: 11px;
    font-weight: 600;
    height: 24px;
    justify-content: center;
    width: 24px;
  }

  .step[data-state='done'] .marker {
    background: var(--status-success-bg);
    border-color: var(--status-success-fg);
    color: var(--status-success-fg);
  }

  .step[data-state='current'] .marker {
    background: var(--primary-subtle);
    border-color: var(--primary);
    color: var(--link);
  }

  .step[data-state='upcoming'] {
    color: var(--text-secondary);
  }

  .step-text {
    flex: 1;
  }

  .step-title {
    font-size: 13px;
    font-weight: 500;
    margin: 0;
  }

  .step[data-state='upcoming'] .step-title {
    color: var(--text-secondary);
  }

  .step-meta {
    color: var(--text-secondary);
    font-size: 12px;
    margin: 1px 0 0;
  }

  .stage {
    color: var(--text-secondary);
    font-size: 11px;
    font-weight: 500;
    white-space: nowrap;
  }

  .step[data-state='current'] .stage {
    color: var(--link);
  }

  .copy {
    color: var(--text-secondary);
    font-size: 13px;
    margin: 0;
    text-align: center;
  }
</style>
