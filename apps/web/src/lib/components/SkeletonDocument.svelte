<div class="document-layout" aria-busy="true">
  <span class="sr-only" role="status">Loading the report</span>
  <div class="main-col" aria-hidden="true">
    <div class="doc-head">
      <div class="skeleton line back"></div>
      <div class="title-row">
        <div class="skeleton line heading"></div>
        <div class="skeleton badge"></div>
      </div>
      <div class="skeleton line subheading"></div>
    </div>
    <div class="paper">
      <div class="meta-grid">
        {#each [1, 2, 3, 4, 5, 6] as cell (cell)}
          <div class="meta-cell">
            <div class="skeleton line meta-label"></div>
            <div class="skeleton line meta-val"></div>
          </div>
        {/each}
      </div>
      <div class="divider"></div>
      {#each [92, 78, 86, 64, 88, 72] as width, index (index)}
        <div class="skeleton line" style="width: {width}%"></div>
      {/each}
    </div>
  </div>
  <aside class="rail" aria-hidden="true">
    <div class="skeleton block"></div>
    <div class="skeleton block short"></div>
  </aside>
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

  .main-col {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .doc-head {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .back {
    width: 110px;
  }

  .title-row {
    align-items: center;
    display: flex;
    gap: 12px;
  }

  .heading {
    height: 24px;
    width: 48%;
  }

  .badge {
    border-radius: 999px;
    height: 22px;
    width: 84px;
  }

  .subheading {
    height: 14px;
    width: 32%;
  }

  .paper {
    background: var(--surface-paper);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 32px;
  }

  .meta-grid {
    display: grid;
    gap: 14px 20px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .meta-cell {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .meta-label {
    height: 10px;
    width: 40%;
  }

  .meta-val {
    height: 14px;
    width: 75%;
  }

  .divider {
    background: var(--border);
    height: 1px;
    margin: 4px 0;
    width: 100%;
  }

  .rail {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .line {
    height: 12px;
  }

  .block {
    border-radius: var(--radius-card);
    height: 140px;
  }

  .block.short {
    height: 96px;
  }
</style>
