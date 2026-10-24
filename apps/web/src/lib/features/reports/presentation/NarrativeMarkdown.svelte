<script lang="ts">
  import { parseNarrative, type NarrativeInline } from '@par/shared';

  /**
   * The narrative subset, rendered as semantic elements (report 7). The parser
   * returns text spans, never an HTML string, so there is nothing to sanitise
   * and no `{@html}` here. Headings start at h3 because the panel owns h2.
   */
  let { source }: { source: string } = $props();

  const blocks = $derived(parseNarrative(source));
</script>

{#snippet inline(spans: NarrativeInline[])}
  {#each spans as span, index (index)}{#if span.bold}<strong>{span.text}</strong>{:else if span.underline}<u>{span.text}</u>{:else if span.italic}<em>{span.text}</em>{:else}{span.text}{/if}{/each}
{/snippet}

<div class="narrative-markdown">
  {#if source.trim() === ''}
    <p class="empty">No narrative text yet.</p>
  {:else}
    {#each blocks as block, blockIndex (blockIndex)}
      {#if block.kind === 'heading'}
        {#if block.level === 1}
          <h3>{@render inline(block.spans)}</h3>
        {:else if block.level === 2}
          <h4>{@render inline(block.spans)}</h4>
        {:else}
          <h5>{@render inline(block.spans)}</h5>
        {/if}
      {:else if block.kind === 'list'}
        {#if block.ordered}
          <ol>
            {#each block.items as item, itemIndex (itemIndex)}<li>{@render inline(item)}</li>{/each}
          </ol>
        {:else}
          <ul>
            {#each block.items as item, itemIndex (itemIndex)}<li>{@render inline(item)}</li>{/each}
          </ul>
        {/if}
      {:else}
        <p>
          {#each block.lines as line, index (index)}{@render inline(line)}{#if index < block.lines.length - 1}<br />{/if}{/each}
        </p>
      {/if}
    {/each}
  {/if}
</div>

<style>
  .narrative-markdown {
    font-size: 13px;
    line-height: 1.6;
    overflow-wrap: anywhere;
  }

  .narrative-markdown :global(h3),
  .narrative-markdown :global(h4),
  .narrative-markdown :global(h5) {
    font-size: 14px;
    margin: 0 0 6px;
  }

  .narrative-markdown :global(h4) {
    font-size: 13px;
  }

  .narrative-markdown :global(h5) {
    font-size: 13px;
    font-weight: 600;
  }

  .narrative-markdown :global(p) {
    margin: 0 0 8px;
  }

  .narrative-markdown :global(p:last-child) {
    margin-bottom: 0;
  }

  .narrative-markdown :global(ul),
  .narrative-markdown :global(ol) {
    margin: 0 0 8px;
    padding-left: 20px;
  }

  .narrative-markdown :global(li) {
    margin: 2px 0;
  }

  .empty {
    color: var(--text-secondary);
    font-size: 13px;
    margin: 0;
  }
</style>
