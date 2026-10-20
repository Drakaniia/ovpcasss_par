<script lang="ts">
  /**
   * Key chips (phase 12 §3). Chips inside one chord are separated by a thin rule;
   * alternative chords read "or". The chip look itself is the shared `.kbd` style.
   */
  let { combos }: { combos: readonly (readonly string[])[] } = $props();
</script>

<span class="keys">
  {#each combos as combo, comboIndex (comboIndex)}
    {#if comboIndex > 0}<span class="alternative">or</span>{/if}
    <span class="chord">
      {#each combo as key, keyIndex (keyIndex)}
        {#if keyIndex > 0}<span class="rule" aria-hidden="true"></span>{/if}
        <kbd class="kbd">{key}</kbd>
      {/each}
    </span>
  {/each}
</span>

<style>
  .keys {
    align-items: center;
    display: inline-flex;
    flex-wrap: wrap;
    gap: 6px;
    justify-content: flex-end;
  }

  .chord {
    align-items: center;
    display: inline-flex;
    gap: 4px;
  }

  .rule {
    background: var(--border);
    height: 12px;
    width: 1px;
  }

  .alternative {
    color: var(--text-secondary);
    font-size: 11px;
  }
</style>
