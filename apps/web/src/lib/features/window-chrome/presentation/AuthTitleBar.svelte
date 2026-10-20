<script lang="ts">
  import BrandSeal from '$lib/components/BrandSeal.svelte';

  import { chromeState } from '../application/chrome-store.svelte';
  import WindowControls from './WindowControls.svelte';

  /**
   * Auth routes on the desktop shell (chrome spec §5.4): seal, a drag surface
   * and the three window controls. No menus, no nav, no tools. The browser keeps
   * its bare auth layout and renders nothing here.
   */
</script>

{#if chromeState.controllable}
  <header class="auth-bar" data-chrome>
    <span class="seal" data-tauri-drag-region aria-hidden="true">
      <BrandSeal size={22} />
    </span>
    <div class="spacer" data-tauri-drag-region></div>
    <WindowControls />
  </header>
{/if}

<style>
  .auth-bar {
    align-items: center;
    background: var(--surface-topbar);
    border-bottom: 1px solid var(--topbar-border);
    color: var(--text-on-topbar);
    display: flex;
    height: calc(var(--titlebar-height) * var(--chrome-inverse));
    left: 0;
    padding-left: calc(12px * var(--chrome-inverse));
    position: fixed;
    right: 0;
    top: 0;
    user-select: none;
    z-index: 30;
  }

  .seal {
    align-items: center;
    display: inline-flex;
    flex: none;
  }

  .seal :global(*) {
    pointer-events: none;
  }

  .spacer {
    flex: 1;
    height: 100%;
  }
</style>
