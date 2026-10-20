<script lang="ts">
  import '../app.css';

  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { onMount, tick } from 'svelte';

  import { startOverlayScrollbars } from '$lib/a11y/overlay-scrollbars';
  import AppShell from '$lib/components/AppShell.svelte';
  import ToastRegion from '$lib/components/ToastRegion.svelte';
  import {
    AUTH_PATHS,
    startupDestination,
  } from '$lib/features/auth/application/startup-route';
  import UpdateToast from '$lib/features/updater/presentation/UpdateToast.svelte';
  import { startChrome } from '$lib/features/window-chrome/application/chrome-store.svelte';
  import { isTauri } from '$lib/platform';
  import { releaseSplash } from '$lib/platform/startup';
  import { loadSession, type SessionUser } from '$lib/session/session.svelte';

  let { children } = $props();
  const withChrome = $derived(!AUTH_PATHS.has(page.url.pathname));

  // Resolve the signed-in account once for the shell; auth pages load their own.
  $effect(() => {
    if (withChrome) void loadSession().catch(() => {});
  });

  $effect(() => {
    if (!('__TAURI_INTERNALS__' in window)) return;
    document.documentElement.classList.add('desktop-shell');
    return startOverlayScrollbars();
  });

  // The window chrome is wired for every route, including auth pages, which
  // draw the slim bar instead of the full titlebar (chrome spec §5.4).
  onMount(() => startChrome());

  /**
   * Desktop launch only: land on the right route, let it paint, then release
   * the splash (startup spec §7.5). Runs once per document, so an in-app reload
   * never waits on a splash that is already closed.
   */
  onMount(() => {
    if (!isTauri()) return;
    void startDesktopShell(page.url.pathname);
  });

  async function startDesktopShell(launchPath: string): Promise<void> {
    let account: SessionUser | null | undefined;

    try {
      account = await loadSession();
    } catch {
      // An unreachable API must not hold the splash; the app shows its own state.
    }

    try {
      // `undefined` means the probe failed: reveal without redirecting.
      if (account !== undefined) {
        const target = startupDestination(launchPath, account);
        if (target) await goto(target, { replaceState: true });
      }

      await tick();
      await nextFrame();
      await nextFrame();
    } catch {
      // A failed navigation still reveals the shell rather than the splash.
    } finally {
      await releaseSplash();
    }
  }

  function nextFrame(): Promise<void> {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }
</script>

{#if withChrome}
  <AppShell>
    {@render children()}
  </AppShell>
{:else}
  {@render children()}
{/if}

<ToastRegion>
  <UpdateToast />
</ToastRegion>
