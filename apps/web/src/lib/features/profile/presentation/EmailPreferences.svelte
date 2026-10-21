<script lang="ts">
  import { AlertCircle, LoaderCircle } from '@lucide/svelte';
  import { onMount } from 'svelte';

  import type { EmailPreferencesResponse } from '@par/shared';

  import { api } from '$lib/api/client';
  import { ApiError } from '$lib/api/http';
  import { toast } from '$lib/toast/toast.svelte';

  type PreferenceField = 'workflow' | 'reminders';

  let prefs = $state<EmailPreferencesResponse | null>(null);
  let loading = $state(true);
  let saving = $state<PreferenceField | null>(null);
  let error = $state<string | null>(null);

  async function load() {
    loading = true;
    error = null;

    try {
      prefs = await api.profile.emailPreferences.get();
    } catch (cause) {
      error =
        cause instanceof ApiError
          ? cause.message
          : 'Your email preferences did not load. Try again.';
    } finally {
      loading = false;
    }
  }

  async function save(field: PreferenceField, value: boolean) {
    if (!prefs || saving) return;

    saving = field;
    error = null;
    // The switch moves immediately; a failure puts it back and says why.
    const previous = prefs;
    prefs = { ...prefs, [field]: value };

    try {
      prefs = await api.profile.emailPreferences.update({ [field]: value });
      toast.success('Email preferences saved');
    } catch (cause) {
      prefs = previous;
      error =
        cause instanceof ApiError
          ? cause.message
          : 'Your preference was not saved. Check your connection and try again.';
    } finally {
      saving = null;
    }
  }

  onMount(() => {
    void load();
  });
</script>

<section class="card card-body" aria-labelledby="email-heading">
  <div class="card-head">
    <h2 id="email-heading">Email</h2>
    <p class="card-copy">
      Which messages reach your mailbox. In-app notifications always continue.
    </p>
  </div>

  {#if loading}
    <div class="rows" aria-hidden="true">
      <div class="skeleton" style="height: 44px; width: 100%"></div>
      <div class="skeleton" style="height: 44px; width: 100%"></div>
    </div>
    <p class="visually-hidden" role="status">Loading email preferences…</p>
  {:else if !prefs}
    <div class="form-alert" role="alert">
      <AlertCircle size={16} aria-hidden="true" />
      <div class="form-alert-body">
        {error ?? 'Your email preferences did not load.'}
        <button class="btn btn-outline btn-sm retry" type="button" onclick={() => void load()}>
          Retry
        </button>
      </div>
    </div>
  {:else}
    {#if error}
      <p class="form-alert" role="alert">
        <AlertCircle size={16} aria-hidden="true" />
        {error}
      </p>
    {/if}

    <div class="rows">
      <label class="switch-row">
        <span class="switch-copy">
          <span class="switch-title">Workflow mail</span>
          <span class="switch-hint">
            Submissions, returns, endorsements, approvals, receipts, and acknowledgements.
          </span>
        </span>
        <span class="switch-control">
          {#if saving === 'workflow'}
            <LoaderCircle class="spin" size={16} aria-hidden="true" />
          {/if}
          <input
            type="checkbox"
            role="switch"
            checked={prefs?.workflow ?? false}
            disabled={saving !== null}
            onchange={(event) => void save('workflow', event.currentTarget.checked)}
          />
        </span>
      </label>

      <label class="switch-row">
        <span class="switch-copy">
          <span class="switch-title">Reminders</span>
          <span class="switch-hint">
            A nudge when a report has been waiting in your queue for three working days.
          </span>
        </span>
        <span class="switch-control">
          {#if saving === 'reminders'}
            <LoaderCircle class="spin" size={16} aria-hidden="true" />
          {/if}
          <input
            type="checkbox"
            role="switch"
            checked={prefs?.reminders ?? false}
            disabled={saving !== null}
            onchange={(event) => void save('reminders', event.currentTarget.checked)}
          />
        </span>
      </label>
    </div>

    <p class="account-note">
      Account and security mail — verification, password reset, role assignment, and account status
      — is always sent and cannot be turned off.
    </p>
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

  .rows {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .switch-row {
    align-items: center;
    border-bottom: 1px solid var(--border);
    display: flex;
    gap: 16px;
    justify-content: space-between;
    padding-bottom: 12px;
  }

  .switch-row:last-child {
    border-bottom: 0;
    padding-bottom: 0;
  }

  .switch-copy {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .switch-title {
    font-size: 13px;
    font-weight: 600;
  }

  .switch-hint {
    color: var(--text-secondary);
    font-size: 12px;
  }

  .switch-control {
    align-items: center;
    display: flex;
    gap: 8px;
  }

  .switch-control input {
    accent-color: var(--brand-navy-800);
    height: 18px;
    width: 18px;
  }

  .account-note {
    color: var(--text-secondary);
    font-size: 12px;
    margin: 16px 0 0;
  }

  .retry {
    margin-left: 8px;
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
