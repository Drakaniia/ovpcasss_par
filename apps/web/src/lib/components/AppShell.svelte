<script lang="ts">
  import { goto } from '$app/navigation';

  import AppHeader from '$lib/components/AppHeader.svelte';
  import SectionTabs from '$lib/components/SectionTabs.svelte';
  import { canSearchRepository } from '$lib/navigation/navigation';
  import { session } from '$lib/session/session.svelte';
  import { focusSearchField, installGlobalShortcuts } from '$lib/shortcuts/keyboard';

  let { children } = $props();

  $effect(() =>
    installGlobalShortcuts({
      search: () => {
        if (!focusSearchField() && canSearchRepository(session.user?.role)) {
          void goto('/search');
        }
      },
      shortcuts: () => window.dispatchEvent(new CustomEvent('par:shortcuts')),
      palette: () => window.dispatchEvent(new CustomEvent('par:palette')),
    }),
  );
</script>

<a class="skip-link" href="#content">Skip to content</a>

<div class="foundation-notice">This system is designed for screens 1024 px and wider.</div>

<div class="app-shell">
  <AppHeader />
  <SectionTabs />
  <main id="content" tabindex="-1" class="page-content">
    {@render children()}
  </main>
</div>

<style>
  .app-shell {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  @media (max-width: 1023px) {
    .app-shell {
      display: none;
    }
  }
</style>
