<script lang="ts">
  import '../app.css';

  import { page } from '$app/state';

  import AppShell from '$lib/components/AppShell.svelte';
  import ToastRegion from '$lib/components/ToastRegion.svelte';
  import { loadSession } from '$lib/session/session.svelte';

  /** Auth and awaiting-approval pages are exempt from the app chrome (§5.3, §12). */
  const BARE_PATHS = new Set([
    '/login',
    '/register',
    '/verify-email',
    '/forgot-password',
    '/reset-password',
    '/awaiting-approval',
  ]);

  let { children } = $props();
  const withChrome = $derived(!BARE_PATHS.has(page.url.pathname));

  // Resolve the signed-in account once for the shell; auth pages load their own.
  $effect(() => {
    if (withChrome) void loadSession().catch(() => {});
  });
</script>

{#if withChrome}
  <AppShell>
    {@render children()}
  </AppShell>
{:else}
  {@render children()}
{/if}

<ToastRegion />
