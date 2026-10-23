<script lang="ts">
  import { page } from '$app/state';

  import RecordDetailPage from '$lib/features/reports/presentation/RecordDetailPage.svelte';

  const id = $derived(page.params.id ?? '');
</script>

{#key id}
  <RecordDetailPage {id} />
{/key}
