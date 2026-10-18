<script lang="ts">
  import { Check, Copy } from '@lucide/svelte';

  let { value, quiet = false }: { value: string | null; quiet?: boolean } = $props();

  let copied = $state(false);
  let timer: ReturnType<typeof setTimeout> | undefined;

  $effect(() => () => clearTimeout(timer));

  async function copy() {
    if (!value || typeof navigator === 'undefined' || !navigator.clipboard) return;

    try {
      await navigator.clipboard.writeText(value);
      copied = true;
      clearTimeout(timer);
      timer = setTimeout(() => (copied = false), 2000);
    } catch {
      copied = false;
    }
  }
</script>

{#if value}
  <button
    class="tracking-number"
    class:is-quiet={quiet}
    type="button"
    title="Copy tracking number"
    aria-label="Copy tracking number {value}"
    onclick={() => void copy()}
  >
    <span class="mono">{value}</span>
    <span class="icon" aria-hidden="true">
      {#if copied}<Check size={12} />{:else}<Copy size={12} />{/if}
    </span>
    <span class="feedback" aria-live="polite">{copied ? 'Copied' : ''}</span>
  </button>
{:else}
  <span class="mono no-number">—</span>
{/if}

<style>
  .tracking-number {
    align-items: center;
    background: transparent;
    border-radius: 4px;
    color: inherit;
    display: inline-flex;
    font-size: 13px;
    gap: 6px;
    height: 26px;
    margin: -2px -4px;
    padding: 0 4px;
    transition: background 120ms ease;
  }

  .tracking-number:hover {
    background: color-mix(in srgb, currentcolor 8%, transparent);
  }

  .mono {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.01em;
  }

  .icon {
    align-items: center;
    display: inline-flex;
    opacity: 0.55;
  }

  .tracking-number:hover .icon,
  .tracking-number:focus-visible .icon {
    opacity: 1;
  }

  .is-quiet {
    font-size: 12px;
  }

  .feedback {
    font-size: 11px;
    opacity: 0.75;
  }

  @media (prefers-reduced-motion: reduce) {
    .tracking-number {
      transition: none;
    }
  }
</style>
