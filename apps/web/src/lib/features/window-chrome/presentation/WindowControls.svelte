<script lang="ts">
  import { chromeAdapter } from '../application/chrome-adapter';
  import {
    chromeState,
    closeGuard,
    minimize,
    toggleMaximize,
  } from '../application/chrome-store.svelte';
  import { zoomState } from '../application/zoom.svelte';

  /**
   * Desktop only. The maximize button is also a native hit region (spec §9.3):
   * Windows needs it to offer Snap Layouts, so mouse presses arrive from Rust and
   * this handler is the keyboard path.
   */
  let maximizeButton = $state<HTMLButtonElement | null>(null);

  const maximizeLabel = $derived(chromeState.maximized ? 'Restore' : 'Maximize');

  async function syncHitRect(): Promise<void> {
    if (!chromeState.controllable || !maximizeButton) return;

    const rect = maximizeButton.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;

    try {
      await (
        await chromeAdapter()
      ).setMaximizeHitRect({
        x: rect.x * ratio,
        y: rect.y * ratio,
        width: rect.width * ratio,
        height: rect.height * ratio,
      });
    } catch {
      // A missing native hook only costs Snap Layouts; the button still works.
    }
  }

  $effect(() => {
    if (!chromeState.controllable || !maximizeButton) return;

    // Zoom changes both the CSS rect and devicePixelRatio.
    void zoomState.scale;
    void syncHitRect();

    const observer = new ResizeObserver(() => void syncHitRect());
    observer.observe(maximizeButton);

    const onResize = () => void syncHitRect();
    window.addEventListener('resize', onResize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', onResize);
    };
  });
</script>

<div class="controls" data-chrome>
  <button class="control" type="button" aria-label="Minimize" onclick={() => void minimize()}>
    <svg viewBox="0 0 10 10" aria-hidden="true"><path d="M0 5h10" /></svg>
  </button>

  <button
    class="control"
    class:is-hovered={chromeState.maximizeHover}
    bind:this={maximizeButton}
    type="button"
    aria-label={maximizeLabel}
    onclick={() => void toggleMaximize()}
  >
    {#if chromeState.maximized}
      <svg viewBox="0 0 10 10" aria-hidden="true">
        <path d="M2.5 2.5h5v5h-5z" />
        <path d="M2.5 2.5v-2h5v5h-2" />
      </svg>
    {:else}
      <svg viewBox="0 0 10 10" aria-hidden="true"><path d="M0.5 0.5h9v9h-9z" /></svg>
    {/if}
  </button>

  <button
    class="control close"
    type="button"
    aria-label="Close"
    onclick={() => void closeGuard.requestClose()}
  >
    <svg viewBox="0 0 10 10" aria-hidden="true"><path d="M0 0l10 10M10 0L0 10" /></svg>
  </button>
</div>

<style>
  .controls {
    align-items: flex-start;
    align-self: stretch;
    display: flex;
    flex: none;
    gap: 0;
    margin-left: calc(12px * var(--chrome-inverse));
  }

  .control {
    align-items: center;
    background: transparent;
    color: var(--text-on-topbar);
    display: inline-flex;
    height: calc(var(--titlebar-height) * var(--chrome-inverse));
    justify-content: center;
    width: calc(var(--window-control-width) * var(--chrome-inverse));
  }

  .control svg {
    fill: none;
    height: calc(10px * var(--chrome-inverse));
    stroke: currentcolor;
    stroke-width: 1;
    width: calc(10px * var(--chrome-inverse));
  }

  .control:hover,
  .control.is-hovered {
    background: var(--topbar-hover);
  }

  .control:active {
    background: var(--topbar-active);
  }

  .control:focus-visible {
    outline: 2px solid var(--brand-gold-400);
    outline-offset: -2px;
  }

  .close:hover {
    background: var(--window-close-hover);
    color: var(--text-on-topbar);
  }

  .close:active {
    background: var(--window-close-active);
  }
</style>
