<script lang="ts">
  let {
    pendingRoleCount,
    onreview,
  }: {
    pendingRoleCount: number;
    onreview: () => void;
  } = $props();

  const sentence = $derived(
    pendingRoleCount === 1
      ? '1 account is waiting for a role assignment'
      : `${pendingRoleCount} accounts are waiting for a role assignment`,
  );
</script>

<header class="page-head">
  <h1>Users &amp; roles</h1>

  {#if pendingRoleCount > 0}
    <div class="callout">
      <p class="callout-text">{sentence}</p>
      <button class="btn btn-outline btn-sm" type="button" onclick={onreview}>
        Review requests
      </button>
    </div>
  {/if}
</header>

<style>
  .page-head {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .page-head h1 {
    letter-spacing: -0.01em;
    margin: 0;
  }

  .callout {
    align-items: center;
    background: var(--status-gold-bg);
    border: 1px solid var(--brand-gold-400);
    border-radius: var(--radius-card);
    display: flex;
    gap: 16px;
    padding: 6px 6px 6px 14px;
  }

  .callout-text {
    color: var(--text-primary);
    font-size: 13px;
    margin: 0;
  }
</style>
