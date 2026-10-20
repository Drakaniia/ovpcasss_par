<script lang="ts">
  import { trapFocus } from '$lib/a11y/focus-trap';
  import { lockScroll, unlockScroll } from '$lib/a11y/scroll-lock';
  import BrandSeal from '$lib/components/BrandSeal.svelte';
  import {
    checkForUpdatesNow,
    holdAutoInstall,
    installUpdate,
    updaterState,
  } from '$lib/features/updater/application/updater.svelte';
  import { isTauri } from '$lib/platform';

  import { chromeState } from '../application/chrome-store.svelte';

  /**
   * About (desktop window chrome spec §9.6): identity, version, WebView2 runtime
   * and an inline update check. The check never installs behind the dialog; the
   * only filled primary here is Close.
   */
  const titleId = $props.id();
  const reasonId = `${titleId}-reason`;
  const desktop = isTauri();

  type CheckStatus = 'idle' | 'checking' | 'current' | 'available' | 'error' | 'unsupported';

  let dialog = $state<HTMLDialogElement | null>(null);
  let closeButton = $state<HTMLButtonElement | null>(null);
  let status = $state<CheckStatus>(desktop ? 'idle' : 'unsupported');

  const version = $derived(
    updaterState.currentVersion || (desktop ? 'Not reported' : 'Browser build'),
  );
  const runtime = $derived.by(() => (desktop ? webView2Version() : null));
  const busy = $derived(status === 'checking');

  /** WebView2 reports itself as `Edg/<major>.<minor>`; the explicit token wins. */
  function webView2Version(): string | null {
    if (typeof navigator === 'undefined') return null;

    const agent = navigator.userAgent;
    const named = /WebView2\/(\d+\.\d+)/i.exec(agent);
    const edge = /Edg\/(\d+\.\d+)/i.exec(agent);
    const match = named ?? edge;

    return match ? `WebView2 ${match[1]}` : null;
  }

  $effect(() => {
    if (!dialog) return;

    if (chromeState.aboutOpen && !dialog.open) {
      status = desktop ? 'idle' : 'unsupported';
      dialog.showModal();
      closeButton?.focus();
    }

    if (!chromeState.aboutOpen && dialog.open) dialog.close();
  });

  $effect(() => {
    if (!chromeState.aboutOpen) return;

    lockScroll();
    holdAutoInstall(true);

    return () => {
      unlockScroll();
      holdAutoInstall(false);
    };
  });

  function requestClose(): void {
    chromeState.aboutOpen = false;
  }

  async function check(): Promise<void> {
    if (busy) return;

    status = 'checking';
    const result = await checkForUpdatesNow().catch(() => 'error' as const);

    status =
      result === 'available'
        ? 'available'
        : result === 'up-to-date'
          ? 'current'
          : result === 'unsupported'
            ? 'unsupported'
            : 'error';
  }
</script>

<dialog
  bind:this={dialog}
  class="dialog about-dialog"
  aria-labelledby={titleId}
  oncancel={(event) => {
    event.preventDefault();
    requestClose();
  }}
  onkeydown={(event) => dialog && trapFocus(event, dialog)}
  onclose={() => (chromeState.aboutOpen = false)}
>
  <header class="about-head">
    <BrandSeal size={40} />
    <div class="about-identity">
      <h2 class="dialog-title" id={titleId}>OVPCASSS Paperless PAR</h2>
      <p class="about-office">
        Office of the Vice President for Culture, Arts, Sports and Student Services
      </p>
    </div>
  </header>

  <dl class="about-facts">
    <div class="fact">
      <dt>Version</dt>
      <dd>{version}</dd>
    </div>
    {#if runtime}
      <div class="fact">
        <dt>Runtime</dt>
        <dd>{runtime}</dd>
      </div>
    {/if}
  </dl>

  <p class="about-update" role="status" aria-live="polite" id={reasonId}>
    {#if !desktop || status === 'unsupported'}
      Updates are available in the desktop app.
    {:else if status === 'checking'}
      Checking for updates…
    {:else if status === 'current'}
      You are up to date.
    {:else if status === 'available'}
      Version {updaterState.version} is available.
    {:else if status === 'error'}
      Could not check for updates.
    {/if}
  </p>

  <div class="about-actions">
    {#if status === 'available'}
      <button class="btn btn-outline" type="button" onclick={() => void installUpdate()}>
        Install update
      </button>
    {/if}

    <button
      class="btn btn-outline"
      type="button"
      disabled={!desktop || busy || status === 'available'}
      aria-describedby={!desktop || status === 'unsupported' ? reasonId : undefined}
      onclick={() => void check()}
    >
      {busy ? 'Checking…' : 'Check for updates'}
    </button>

    <button bind:this={closeButton} class="btn btn-primary" type="button" onclick={requestClose}>
      Close
    </button>
  </div>
</dialog>

<style>
  .about-dialog {
    max-width: 460px;
  }

  .about-head {
    align-items: center;
    display: flex;
    gap: 14px;
  }

  .about-identity {
    min-width: 0;
  }

  .about-identity h2 {
    margin: 0;
  }

  .about-office {
    color: var(--text-secondary);
    font-size: 12px;
    line-height: 1.45;
    margin: 4px 0 0;
  }

  .about-facts {
    border-bottom: 1px solid var(--border);
    border-top: 1px solid var(--border);
    display: grid;
    gap: 8px;
    margin: 20px 0 0;
    padding: 14px 0;
  }

  .fact {
    display: flex;
    font-size: 13px;
    gap: 16px;
    justify-content: space-between;
  }

  .fact dt {
    color: var(--text-secondary);
  }

  .fact dd {
    font-variant-numeric: tabular-nums;
    margin: 0;
  }

  /* The region stays in the layout so a result never shifts the actions. */
  .about-update {
    font-size: 13px;
    margin: 14px 0 0;
    min-height: 20px;
  }

  .about-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: flex-end;
    margin-top: 20px;
  }
</style>
