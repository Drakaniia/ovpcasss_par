<script lang="ts">
  import { Download, TriangleAlert, X } from '@lucide/svelte';
  import { onMount } from 'svelte';

  import {
    dismissUpdateNotice,
    installUpdate,
    startUpdater,
    updaterState,
    useCurrentVersion,
  } from '../application/updater.svelte';

  onMount(() => {
    void startUpdater();
  });

  const visible = $derived(
    updaterState.status === 'downloading' ||
      updaterState.status === 'ready' ||
      updaterState.status === 'installing' ||
      updaterState.status === 'error' ||
      updaterState.status === 'up-to-date',
  );
</script>

{#if visible}
  <div class="toast update-toast">
    {#if updaterState.status === 'downloading'}
      <Download size={16} aria-hidden="true" />
      <div class="update-body">
        <p class="update-title">Downloading version {updaterState.version}</p>
        <div
          class="update-progress"
          role="progressbar"
          aria-label="Update download progress"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow={updaterState.progress}
        >
          <span style:width="{updaterState.progress}%"></span>
        </div>
        <p class="update-copy">{updaterState.progress}%</p>
      </div>
    {:else if updaterState.status === 'ready'}
      <div class="update-body">
        <p class="update-title">Version {updaterState.version} is ready</p>
        <p class="update-copy">
          The app restarts to install it after five minutes without activity.
        </p>
        <div class="update-actions">
          <button class="btn btn-outline btn-sm" type="button" onclick={() => void installUpdate()}>
            Restart now
          </button>
          <button class="btn btn-ghost btn-sm" type="button" onclick={useCurrentVersion}>
            Use current version
          </button>
        </div>
      </div>
    {:else if updaterState.status === 'installing'}
      <div class="update-body">
        <p class="update-title">Installing version {updaterState.version}</p>
        <p class="update-copy">The app will restart shortly.</p>
      </div>
    {:else if updaterState.status === 'error'}
      <TriangleAlert size={16} aria-hidden="true" />
      <div class="update-body">
        <p class="update-title">The update did not finish</p>
        <p class="update-copy">Check your connection and try again from Profile.</p>
      </div>
      <button
        class="dismiss"
        type="button"
        aria-label="Dismiss update notice"
        onclick={dismissUpdateNotice}
      >
        <X size={14} aria-hidden="true" />
      </button>
    {:else}
      <div class="update-body">
        <p class="update-title">You are using the latest version</p>
      </div>
    {/if}
  </div>
{/if}

<style>
  .update-toast {
    width: min(380px, calc(100vw - 48px));
  }

  .update-body {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }

  .update-title {
    font-weight: 600;
    margin: 0;
  }

  .update-copy {
    color: var(--text-secondary);
    margin: 0;
  }

  .update-progress {
    background: var(--surface-page);
    border-radius: 999px;
    height: 4px;
    overflow: hidden;
  }

  .update-progress span {
    background: var(--primary);
    display: block;
    height: 100%;
    transition: width 120ms linear;
  }

  .update-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 2px;
  }

  .dismiss {
    align-items: center;
    background: transparent;
    border-radius: 4px;
    color: var(--text-secondary);
    display: inline-flex;
    flex: none;
    height: 24px;
    justify-content: center;
    width: 24px;
  }

  .dismiss:hover {
    background: var(--surface-page);
    color: var(--text-primary);
  }
</style>
