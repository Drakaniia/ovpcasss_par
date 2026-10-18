<script lang="ts">
  import { page } from '$app/state';

  import EditReturnedPage from '$lib/features/reports/presentation/EditReturnedPage.svelte';
</script>

<!-- A different report is a different page: remount rather than reuse state. -->
{#key page.params.id}
  <EditReturnedPage id={page.params.id ?? ''} />
{/key}
