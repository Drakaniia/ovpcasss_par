<script lang="ts">
  import { page } from '$app/state';

  import QueueDetailPage from '$lib/features/queues/presentation/QueueDetailPage.svelte';

  const id = $derived(page.params.id ?? '');
  /** The queue's filters travel with the report so the breadcrumb returns to them. */
  const search = $derived(page.url.search.replace(/^\?/, ''));
</script>

<!-- A different report is a different page: remount rather than reuse state. -->
{#key id}
  <QueueDetailPage kind="review" {id} {search} />
{/key}
