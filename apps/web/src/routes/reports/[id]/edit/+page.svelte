<script lang="ts">
  import type { ReportDetail } from '@par/shared';
  import { page } from '$app/state';
  import { onMount } from 'svelte';

  import { api } from '$lib/api/client';
  import { ApiError } from '$lib/api/http';
  import ErrorState from '$lib/components/ErrorState.svelte';
  import SkeletonDocument from '$lib/components/SkeletonDocument.svelte';
  import RecordFormPage from '$lib/features/reports/presentation/RecordFormPage.svelte';

  let detail = $state<ReportDetail | null>(null);
  let failure = $state<{ status: number; requestId?: string } | null>(null);

  async function load(): Promise<void> {
    failure = null;

    try {
      detail = await api.reports.get(page.params.id ?? '');
    } catch (error) {
      failure = {
        status: error instanceof ApiError ? error.status : 0,
        requestId: error instanceof ApiError ? error.requestId : undefined,
      };
    }
  }

  onMount(() => {
    void load();
  });
</script>

<svelte:head><title>Edit record · OVPCASSS Paperless PAR</title></svelte:head>

{#if failure}
  {#if failure.status === 404}
    <ErrorState
      title="This record does not exist"
      description="It may have been deleted, or the link is no longer valid."
      backHref="/reports"
      backLabel="Back to reports"
    />
  {:else if failure.status === 403}
    <ErrorState
      variant="permission"
      title="You cannot edit this record"
      description="Only an administrator may change the office register."
      backHref="/reports"
      backLabel="Back to reports"
    />
  {:else}
    <ErrorState
      title="We could not load this record"
      description="The request did not complete. Try again."
      requestId={failure.requestId}
      onretry={() => void load()}
      backHref="/reports"
      backLabel="Back to reports"
    />
  {/if}
{:else if detail}
  {#if detail.status === 'APPROVED' || detail.canManage === false}
    <ErrorState
      variant="permission"
      title="This record can no longer be changed"
      description="An approved record locks its activity details, personnel in charge, narrative, and deletion."
      backHref="/reports/{detail.id}"
      backLabel="Back to the record"
    />
  {:else}
    <RecordFormPage mode="edit" id={detail.id} {detail} />
  {/if}
{:else}
  <SkeletonDocument />
{/if}
