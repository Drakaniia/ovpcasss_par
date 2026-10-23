<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  import SearchPage from '$lib/features/search/presentation/SearchPage.svelte';
  import { canSearchRepository } from '$lib/navigation/navigation';
  import { loadSession } from '$lib/session/session.svelte';

  // The repository is the office's (2026-10-23); a personnel account reads its own
  // records from Home, so a bookmarked or typed /search goes back there.
  onMount(() => {
    void loadSession().then((account) => {
      if (account && !canSearchRepository(account.role)) void goto('/', { replaceState: true });
    });
  });
</script>

<SearchPage />
