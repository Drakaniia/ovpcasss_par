<script lang="ts">
  import { onDestroy, onMount } from 'svelte';

  import { apiDownload } from '$lib/api/http';

  /**
   * The stored signature, fetched as bytes through the session (bug phase 05
   * §3.8). An `<img>` cannot carry the desktop bearer token, so both shells use
   * one object URL built from `apiDownload`; the raw object key never leaks.
   * `onready` fires once the picture is on the page, so a print waits for it.
   */
  let {
    reportId,
    side = 'narrative',
    alt,
    onready,
  }: {
    reportId: string;
    side?: 'narrative' | 'approval';
    alt: string;
    onready?: () => void;
  } = $props();

  let url = $state<string | null>(null);
  let settled = $state(false);

  function settle(): void {
    if (settled) return;
    settled = true;
    onready?.();
  }

  async function load(): Promise<void> {
    try {
      const path =
        side === 'approval'
          ? `/reports/${reportId}/approval-signature/file`
          : `/reports/${reportId}/signature/file`;
      const blob = await apiDownload(path);
      url = URL.createObjectURL(blob);
    } catch {
      settle();
    }
  }

  onMount(() => {
    void load();
  });

  onDestroy(() => {
    if (url) URL.revokeObjectURL(url);
  });
</script>

{#if url}
  <img class="signature-image" src={url} {alt} onload={settle} onerror={settle} />
{/if}

<style>
  .signature-image {
    display: block;
    max-height: 44px;
    max-width: 210px;
    object-fit: contain;
    object-position: left bottom;
  }
</style>
