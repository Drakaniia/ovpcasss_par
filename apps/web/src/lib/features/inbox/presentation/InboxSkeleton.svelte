<script lang="ts">
  let { showHead = true }: { showHead?: boolean } = $props();

  /** Widths are percentages so the bars read as text, not as a filled row. */
  const rowWidths = [58, 74, 46];
</script>

<div class="inbox-skeleton" aria-busy="true">
  <p class="sr-only" role="status">Loading your work inbox…</p>

  {#if showHead}
    <div class="head">
      <div>
        <div class="skeleton" style="height: 24px; width: 320px"></div>
        <div class="skeleton" style="height: 12px; margin-top: 8px; width: 220px"></div>
      </div>
      <div class="skeleton" style="height: 36px; width: 128px"></div>
    </div>
  {/if}

  <div class="desk">
    <div class="main">
      <section class="brief" aria-hidden="true">
        <div class="skeleton" style="height: 12px; width: 96px"></div>
        <div class="brief-grid">
          {#each [1, 2, 3] as stat (stat)}
            <div class="stat">
              <div class="skeleton" style="height: 26px; width: 26px"></div>
              <div class="skeleton" style="height: 12px; width: 68%"></div>
            </div>
          {/each}
        </div>
      </section>

      <div class="cards">
        {#each [1, 2] as card (card)}
          <section class="card section-card" aria-hidden="true">
            <div class="section-head">
              <div class="title-group">
                <div class="skeleton" style="height: 15px; width: 180px"></div>
                <div class="skeleton count"></div>
              </div>
              <div class="skeleton" style="height: 14px; width: 96px"></div>
            </div>
            <div class="rows">
              {#each rowWidths as width (width)}
                <div class="skeleton-row">
                  <div class="skeleton" style="height: 12px; width: 72px"></div>
                  <div class="skeleton" style="height: 12px; width: {width}%"></div>
                  <div class="skeleton" style="height: 12px; width: 84px"></div>
                </div>
              {/each}
            </div>
          </section>
        {/each}
      </div>
    </div>

    <aside class="rail" aria-hidden="true">
      {#each [1, 2] as panel (panel)}
        <section class="card activity-card">
          <div class="activity-head">
            <div class="skeleton" style="height: 13px; width: 136px"></div>
            <div class="skeleton" style="height: 12px; width: 72px"></div>
          </div>
          <div class="activity-list">
            {#each [1, 2, 3] as item (item)}
              <div class="activity-item">
                <div class="skeleton" style="height: 12px; width: {item === 2 ? 64 : 82}%"></div>
                <div class="skeleton" style="height: 11px; width: 28px"></div>
              </div>
            {/each}
          </div>
        </section>
      {/each}
    </aside>
  </div>
</div>

<style>
  .head {
    align-items: flex-start;
    display: flex;
    gap: 24px;
    justify-content: space-between;
    margin-bottom: 24px;
  }

  /* Same two-column desk as the inbox: work wide, record of work in the rail. */
  .desk {
    align-items: start;
    display: grid;
    gap: 32px;
    grid-template-columns: minmax(0, 1fr);
  }

  .main {
    display: flex;
    flex-direction: column;
    gap: 20px;
    min-width: 0;
  }

  .brief {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  /* One instrument with hairline dividers, as the stat row renders it. */
  .brief-grid {
    background: var(--border);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-card);
    display: grid;
    gap: 1px;
    grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
    overflow: hidden;
  }

  .stat {
    align-items: center;
    background: var(--surface-card);
    display: flex;
    gap: 12px;
    padding: 14px 18px;
  }

  .cards {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .section-card {
    overflow: hidden;
  }

  .section-head {
    align-items: center;
    border-bottom: 1px solid var(--border);
    display: flex;
    gap: 16px;
    justify-content: space-between;
    min-height: 48px;
    padding: 8px 18px;
  }

  .title-group {
    align-items: center;
    display: flex;
    gap: 10px;
    min-width: 0;
  }

  .count {
    border-radius: 999px;
    height: 18px;
    min-width: 24px;
  }

  .skeleton-row:first-child {
    border-top: 0;
  }

  .skeleton-row {
    align-items: center;
    border-top: 1px solid var(--border);
    display: grid;
    gap: 16px;
    grid-template-columns: 112px minmax(0, 1fr) minmax(0, auto);
    min-height: 40px;
    padding: 6px 18px;
  }

  .rail {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
  }

  .activity-card {
    overflow: hidden;
  }

  .activity-head {
    align-items: center;
    display: flex;
    gap: 16px;
    justify-content: space-between;
    min-height: 44px;
    padding: 8px 18px;
  }

  .activity-list {
    display: flex;
    flex-direction: column;
    padding: 0 18px 12px;
  }

  .activity-item {
    align-items: center;
    border-top: 1px solid var(--border);
    display: flex;
    gap: 12px;
    justify-content: space-between;
    padding: 8px 0;
  }

  @media (min-width: 1280px) {
    .desk {
      grid-template-columns: minmax(0, 1fr) 320px;
    }
  }
</style>
