<script lang="ts">
  import { onMount } from 'svelte';

  import {
    checkForUpdates,
    installUpdate,
    setAutoCheck,
    setAutoInstall,
    startUpdater,
    updaterState,
    useCurrentVersion,
    type UpdaterStatus,
  } from '../application/updater.svelte';

  onMount(() => {
    void startUpdater();
  });

  const STATUS_LABELS: Record<Exclude<UpdaterStatus, 'downloading' | 'ready'>, string> = {
    idle: 'No update pending',
    checking: 'Checking for updates',
    installing: 'Installing',
    error: 'The last check did not complete',
    'up-to-date': 'Up to date',
  };

  const busy = $derived(
    updaterState.status === 'checking' ||
      updaterState.status === 'downloading' ||
      updaterState.status === 'installing',
  );
  const ready = $derived(updaterState.status === 'ready');

  const statusLabel = $derived(
    updaterState.status === 'downloading'
      ? `Downloading version ${updaterState.version} (${updaterState.progress}%)`
      : updaterState.status === 'ready'
        ? `Version ${updaterState.version} is ready to install`
        : STATUS_LABELS[updaterState.status],
  );
</script>

{#if updaterState.supported}
  <section class="card card-body" aria-labelledby="updates-heading">
    <div class="card-head">
      <h2 id="updates-heading">Application updates</h2>
      <p class="card-copy">This desktop app checks for signed updates when it opens.</p>
    </div>

    <dl class="update-meta">
      <div>
        <dt>Current version</dt>
        <dd>{updaterState.currentVersion || 'Unknown'}</dd>
      </div>
      <div>
        <dt>Status</dt>
        <dd aria-live="polite">{statusLabel}</dd>
      </div>
    </dl>

    <label class="update-check">
      <input
        type="checkbox"
        checked={updaterState.prefs.autoCheck}
        onchange={(event) => setAutoCheck(event.currentTarget.checked)}
      />
      Check for updates when the app opens
    </label>

    <label class="update-check">
      <input
        type="checkbox"
        checked={updaterState.prefs.autoInstall}
        onchange={(event) => setAutoInstall(event.currentTarget.checked)}
      />
      Install and restart automatically when idle
    </label>

    <p class="field-hint">
      Automatic install waits five minutes without activity and never starts while a report is open.
      Saved drafts stay on this device.
    </p>

    <div class="form-actions">
      {#if ready}
        <button class="btn btn-ghost" type="button" onclick={useCurrentVersion}>
          Use current version
        </button>
        <button class="btn btn-outline" type="button" onclick={() => void installUpdate()}>
          Restart to install
        </button>
      {:else}
        <button
          class="btn btn-outline"
          type="button"
          disabled={busy}
          onclick={() => void checkForUpdates()}
        >
          {updaterState.status === 'checking' ? 'Checking…' : 'Check for updates'}
        </button>
      {/if}
    </div>
  </section>
{/if}

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

  .update-meta {
    display: grid;
    gap: 12px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin: 0 0 20px;
  }

  .update-meta dt {
    color: var(--text-secondary);
    font-size: 12px;
  }

  .update-meta dd {
    font-size: 14px;
    margin: 2px 0 0;
  }

  .update-check {
    align-items: flex-start;
    display: flex;
    font-size: 13px;
    gap: 8px;
    margin-bottom: 10px;
  }

  .update-check input {
    margin-top: 2px;
  }

  .field-hint {
    margin: 4px 0 0;
  }

  .form-actions {
    justify-content: flex-end;
    margin-top: 20px;
  }
</style>
