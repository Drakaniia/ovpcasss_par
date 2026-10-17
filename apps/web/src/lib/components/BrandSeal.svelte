<script lang="ts">
  let { size = 28, wordmark = false }: { size?: number; wordmark?: boolean } = $props();
</script>

<span class="brand" style="--seal-size: {size}px">
  <span class="seal" aria-hidden="true">
    <span class="seal-letter">O</span>
  </span>
  {#if wordmark}
    <span class="brand-text">
      <span class="brand-name">OVPCASSS</span>
      <span class="brand-product">Paperless PAR</span>
    </span>
  {/if}
</span>

<style>
  .brand {
    align-items: center;
    color: inherit;
    display: inline-flex;
    gap: 10px;
  }

  /* Placeholder mark until the brand guide confirms the seal may be used in chrome. */
  .seal {
    align-items: center;
    border: 1.5px solid var(--brand-gold-600);
    border-radius: 50%;
    display: inline-flex;
    flex: none;
    height: var(--seal-size);
    justify-content: center;
    outline: 1px solid var(--brand-gold-600);
    outline-offset: -5px;
    width: var(--seal-size);
  }

  .seal-letter {
    font-family: var(--font-document);
    font-size: calc(var(--seal-size) * 0.48);
    font-weight: 600;
    line-height: 1;
  }

  .brand-text {
    display: flex;
    flex-direction: column;
    line-height: 1.2;
  }

  .brand-name {
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 0.02em;
  }

  .brand-product {
    font-size: 11px;
    opacity: 0.72;
  }
</style>
