<script lang="ts">
  import { Plus } from '@lucide/svelte';

  let {
    label,
    showInactive,
    disabled,
    oninactive,
    onadd,
  }: {
    label: string;
    showInactive: boolean;
    disabled: boolean;
    oninactive: (next: boolean) => void;
    onadd: () => void;
  } = $props();
</script>

<header class="entity-head">
  <h2 id="entity-heading">{label}</h2>

  <div class="entity-actions">
    <label class="inactive-toggle">
      <input
        type="checkbox"
        checked={showInactive}
        {disabled}
        onchange={(event) => oninactive(event.currentTarget.checked)}
      />
      <span>Show inactive</span>
    </label>

    <button
      id="reference-add-entry"
      class="btn btn-primary"
      type="button"
      {disabled}
      onclick={onadd}
    >
      <Plus size={14} aria-hidden="true" />
      Add entry
    </button>
  </div>
</header>

<style>
  .entity-head {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    justify-content: space-between;
    padding: 16px 20px;
  }

  .entity-head h2 {
    font-size: 18px;
    margin: 0;
  }

  .entity-actions {
    align-items: center;
    display: flex;
    gap: 20px;
  }

  .inactive-toggle {
    align-items: center;
    color: var(--text-secondary);
    cursor: pointer;
    display: inline-flex;
    font-size: 13px;
    gap: 8px;
  }

  .inactive-toggle input {
    height: 16px;
    width: 16px;
  }
</style>
