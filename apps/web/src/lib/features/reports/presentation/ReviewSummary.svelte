<script lang="ts">
  import type { ReviewSection } from '../application/wizard-review';
  import type { WizardStep } from '../application/wizard-form';

  let {
    sections,
    onedit,
  }: {
    sections: ReviewSection[];
    onedit: (step: WizardStep) => void;
  } = $props();
</script>

<div class="review">
  {#each sections as section (section.step)}
    <section class="review-section" aria-labelledby={`review-${section.step}`}>
      <div class="section-head">
        <h3 id={`review-${section.step}`}>{section.title}</h3>
        <button
          class="edit"
          type="button"
          aria-label="Edit {section.title}"
          onclick={() => onedit(section.step)}
        >
          Edit
        </button>
      </div>

      <dl class="rows">
        {#each section.rows as row (row.label)}
          <div class="row">
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        {/each}
      </dl>
    </section>
  {/each}
</div>

<style>
  .review {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .review-section {
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    padding: 16px;
  }

  .section-head {
    align-items: center;
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  h3 {
    margin: 0;
  }

  .edit {
    background: none;
    border: 0;
    color: var(--link);
    font-size: 12px;
    padding: 2px 4px;
  }

  .edit:hover {
    text-decoration: underline;
  }

  .rows {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin: 0;
  }

  .row {
    display: grid;
    gap: 16px;
    grid-template-columns: 180px minmax(0, 1fr);
  }

  dt {
    color: var(--text-secondary);
    font-size: 12px;
  }

  dd {
    font-size: 13px;
    margin: 0;
    overflow-wrap: anywhere;
    white-space: pre-wrap;
  }
</style>
