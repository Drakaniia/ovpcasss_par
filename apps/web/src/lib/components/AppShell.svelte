<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { onMount } from 'svelte';

  import CommandPalette from '$lib/components/CommandPalette.svelte';
  import ShortcutHelpDialog from '$lib/components/ShortcutHelpDialog.svelte';
  import OnboardingTour from '$lib/features/onboarding/presentation/OnboardingTour.svelte';
  import { installAccelerators } from '$lib/features/window-chrome/application/accelerators';
  import { registerBuiltinCommands } from '$lib/features/window-chrome/application/builtin-commands';
  import { chromeState } from '$lib/features/window-chrome/application/chrome-store.svelte';
  import AboutDialog from '$lib/features/window-chrome/presentation/AboutDialog.svelte';
  import CloseGuardDialog from '$lib/features/window-chrome/presentation/CloseGuardDialog.svelte';
  import NavigationRow from '$lib/features/window-chrome/presentation/NavigationRow.svelte';
  import TitleBar from '$lib/features/window-chrome/presentation/TitleBar.svelte';
  import ZoomIndicator from '$lib/features/window-chrome/presentation/ZoomIndicator.svelte';
  import { canSearchRepository } from '$lib/navigation/navigation';
  import { refreshInboxAttention } from '$lib/session/inbox-attention.svelte';
  import { session } from '$lib/session/session.svelte';
  import { focusSearchField, installGlobalShortcuts } from '$lib/shortcuts/keyboard';

  let { children } = $props();

  /** Only one global tool is open at a time: opening one closes the other (phase 12 §5). */
  let helpOpen = $state(false);
  let paletteOpen = $state(false);

  onMount(() => {
    // The window itself is wired once in the root layout; this route-level part
    // is the command set and its keyboard path.
    const disposeCommands = registerBuiltinCommands();
    const stopAccelerators = installAccelerators({ controllable: () => chromeState.controllable });

    // Tab dots reconcile when the window regains focus (bug phase 08 §3.7).
    const onFocus = () => void refreshInboxAttention();
    window.addEventListener('focus', onFocus);

    return () => {
      window.removeEventListener('focus', onFocus);
      stopAccelerators();
      disposeCommands();
    };
  });

  // Every navigation reads the counts again, throttled to one request a minute.
  $effect(() => {
    void page.url.pathname;
    void refreshInboxAttention();
  });

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

  $effect(() => {
    const openHelp = () => {
      paletteOpen = false;
      helpOpen = true;
    };
    const openPalette = () => {
      helpOpen = false;
      paletteOpen = true;
    };

    window.addEventListener('par:shortcuts', openHelp);
    window.addEventListener('par:palette', openPalette);

    return () => {
      window.removeEventListener('par:shortcuts', openHelp);
      window.removeEventListener('par:palette', openPalette);
    };
  });
</script>

<a class="skip-link" href="#content">Skip to content</a>

<div class="foundation-notice">This system is designed for screens 1024 px and wider.</div>

<div class="app-shell">
  <TitleBar />
  <NavigationRow />
  <main id="content" tabindex="-1" class="page-content">
    {@render children()}
  </main>

  <AboutDialog />
  <CloseGuardDialog />
  <ZoomIndicator />
  <ShortcutHelpDialog bind:open={helpOpen} />
  <CommandPalette bind:open={paletteOpen} />
  <OnboardingTour />
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
