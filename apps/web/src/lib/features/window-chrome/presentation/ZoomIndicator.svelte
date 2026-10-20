<script lang="ts">
  import { zoomLabel } from '../application/zoom-limits';
  import { zoomState } from '../application/zoom.svelte';

  /**
   * The brief zoom readout (desktop window chrome spec §8.4). It stays mounted so
   * the polite live region exists before the text changes, and fades out of the
   * way when the change is old.
   */
</script>

<p class="zoom-indicator" class:is-visible={zoomState.indicator} role="status" aria-live="polite">
  Zoom {zoomLabel(zoomState.scale)}
</p>

<style>
  .zoom-indicator {
    background: var(--surface-topbar);
    border-radius: 999px;
    bottom: 20px;
    box-shadow: var(--shadow-raised);
    color: var(--text-on-topbar);
    font-size: 13px;
    font-variant-numeric: tabular-nums;
    margin: 0;
    opacity: 0;
    padding: 6px 12px;
    pointer-events: none;
    position: fixed;
    right: 20px;
    transition: opacity 160ms ease;
    visibility: hidden;
    z-index: 60;
  }

  .zoom-indicator.is-visible {
    opacity: 1;
    visibility: visible;
  }

  @media (prefers-reduced-motion: reduce) {
    .zoom-indicator {
      transition: none;
    }
  }
</style>
