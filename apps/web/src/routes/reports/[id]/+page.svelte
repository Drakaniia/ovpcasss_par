<script lang="ts">
  import { page } from '$app/state';

  import FacsimilePage from '$lib/features/facsimile/presentation/FacsimilePage.svelte';

  const id = $derived(page.params.id ?? '');
  /** `?print=1` is the print preview (UI spec §7.8); the URL is the view state. */
  const print = $derived(page.url.searchParams.get('print') === '1');
</script>

<!-- A different report is a different page: remount rather than reuse state. -->
{#key id}
  <FacsimilePage {id} {print} />
{/key}
