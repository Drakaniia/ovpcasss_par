<script lang="ts">
  import type { DiffResult } from '../application/audit-diff';

  let {
    diff,
  }: {
    diff: DiffResult;
  } = $props();

  let showUnchanged = $state(false);
  let expandedKeys = $state<Record<string, boolean>>({});

  const displayedFields = $derived(
    showUnchanged ? [...diff.changed, ...diff.unchanged] : diff.changed,
  );

  function toggleClamp(key: string) {
    expandedKeys[key] = !expandedKeys[key];
  }
</script>

<div class="diff-container">
  {#if !diff.hasChanges}
    <p class="no-changes-note">No field changes recorded.</p>
  {:else}
    <div class="diff-table-container">
      <table class="diff-table">
        <thead>
          <tr>
            <th scope="col" style="width: 30%">Field</th>
            <th scope="col" style="width: 35%">Before</th>
            <th scope="col" style="width: 35%">After</th>
          </tr>
        </thead>
        <tbody>
          {#each displayedFields as field (field.key)}
            <tr class:is-changed={field.changed} class:is-unchanged={!field.changed}>
              <td class="diff-key mono">{field.key}</td>
              <td class="diff-val">
                {#if field.before.length > 80 && !expandedKeys[`${field.key}_before`]}
                  <span class="clamped-text">{field.before.slice(0, 80)}…</span>
                  <button
                    class="clamp-btn"
                    type="button"
                    onclick={() => toggleClamp(`${field.key}_before`)}
                  >
                    Show more
                  </button>
                {:else}
                  <span class="full-text">{field.before}</span>
                  {#if field.before.length > 80}
                    <button
                      class="clamp-btn"
                      type="button"
                      onclick={() => toggleClamp(`${field.key}_before`)}
                    >
                      Show less
                    </button>
                  {/if}
                {/if}
              </td>
              <td class="diff-val">
                {#if field.after.length > 80 && !expandedKeys[`${field.key}_after`]}
                  <span class="clamped-text">{field.after.slice(0, 80)}…</span>
                  <button
                    class="clamp-btn"
                    type="button"
                    onclick={() => toggleClamp(`${field.key}_after`)}
                  >
                    Show more
                  </button>
                {:else}
                  <span class="full-text">{field.after}</span>
                  {#if field.after.length > 80}
                    <button
                      class="clamp-btn"
                      type="button"
                      onclick={() => toggleClamp(`${field.key}_after`)}
                    >
                      Show less
                    </button>
                  {/if}
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    {#if diff.unchanged.length > 0}
      <div class="unchanged-toggle-bar">
        <button
          class="unchanged-toggle-btn"
          type="button"
          onclick={() => (showUnchanged = !showUnchanged)}
        >
          {showUnchanged ? 'Hide' : 'Show'} unchanged fields ({diff.unchanged.length})
        </button>
      </div>
    {/if}
  {/if}
</div>

<style>
  .diff-container {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .no-changes-note {
    color: var(--text-secondary);
    font-size: 13px;
    font-style: italic;
    margin: 0;
  }

  .diff-table-container {
    border: 1px solid var(--border);
    border-radius: var(--radius-badge);
    max-height: 260px;
    overflow-y: auto;
  }

  .diff-table {
    border-collapse: collapse;
    font-size: 13px;
    width: 100%;
  }

  .diff-table th {
    background: var(--surface-card);
    border-bottom: 1px solid var(--border);
    color: var(--text-secondary);
    font-size: 12px;
    font-weight: 600;
    padding: 6px 12px;
    text-align: left;
  }

  .diff-table td {
    border-bottom: 1px solid var(--border);
    padding: 6px 12px;
    vertical-align: top;
  }

  .diff-table tr:last-child td {
    border-bottom: none;
  }

  .diff-key {
    color: var(--text-secondary);
  }

  .is-changed td {
    background: rgba(234, 179, 8, 0.05);
  }

  .diff-val {
    color: var(--text-primary);
    white-space: pre-wrap;
    word-break: break-word;
  }

  .clamp-btn {
    background: none;
    border: none;
    color: var(--primary);
    cursor: pointer;
    font-size: 11px;
    margin-left: 6px;
    padding: 0;
    text-decoration: underline;
  }

  .unchanged-toggle-bar {
    margin-top: 6px;
  }

  .unchanged-toggle-btn {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 12px;
    padding: 2px 4px;
    text-decoration: underline;
  }

  .unchanged-toggle-btn:hover {
    color: var(--text-primary);
  }

  .mono {
    font-family: var(--font-mono);
  }
</style>
