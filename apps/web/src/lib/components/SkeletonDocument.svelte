<div class="document-layout" aria-busy="true">
  <span class="sr-only">Loading</span>
  <div class="paper" aria-hidden="true">
    <div class="skeleton line heading"></div>
    <div class="skeleton line subheading"></div>
    <div class="rule"></div>
    {#each [92, 78, 86, 64, 88, 72] as width, index (index)}
      <div class="skeleton line" style="width: {width}%"></div>
    {/each}
    <div class="grid">
      {#each [88, 72, 80, 66] as width, index (index)}
        <div class="skeleton line" style="width: {width}%"></div>
      {/each}
    </div>
  </div>
  <div class="rail" aria-hidden="true">
    <div class="skeleton block"></div>
    <div class="skeleton block short"></div>
  </div>
</div>

<style>
  .document-layout {
    display: grid;
    gap: 24px;
    grid-template-columns: minmax(0, 1fr) 280px;
  }

  @media (max-width: 1279px) {
    .document-layout {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  .paper {
    background: var(--surface-paper);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 40px;
  }

  .rail {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .line {
    background: color-mix(in srgb, var(--text-paper) 12%, transparent);
    height: 12px;
  }

  .heading {
    height: 22px;
    width: 48%;
  }

  .subheading {
    height: 14px;
    width: 32%;
  }

  .rule {
    background: var(--brand-gold-400);
    height: 2px;
    margin: 8px 0;
    width: 100%;
  }

  .grid {
    display: grid;
    gap: 12px;
    grid-template-columns: 1fr 1fr;
    margin-top: 8px;
  }

  .block {
    background: var(--border);
    border-radius: var(--radius-card);
    height: 120px;
  }

  .block.short {
    height: 80px;
  }
</style>
