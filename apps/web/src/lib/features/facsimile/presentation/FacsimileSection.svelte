<script lang="ts">
  import type { FacsimileSection } from '../application/facsimile-document';

  /**
   * One ruled section of the paper form (UI spec §8.1). Values align right in
   * the two-column grid at ≥1024 px and stack below; long values wrap without
   * breaking the rule.
   */
  let { section }: { section: FacsimileSection } = $props();
</script>

<section class="doc-section" aria-labelledby="section-{section.id}">
  <h3 id="section-{section.id}" class="section-heading">
    <span class="numeral">{section.numeral}.</span>
    {section.title}
  </h3>

  <dl class="fields">
    {#each section.rows as row (row.label)}
      <div class="field-row">
        <dt>{row.label}</dt>
        <dd class:multiline={row.multiline}>{row.value}</dd>
      </div>
    {/each}
  </dl>
</section>

<style>
  .doc-section {
    border-top: 1px solid color-mix(in srgb, var(--text-paper) 16%, transparent);
    padding: 14px 0 10px;
  }

  .section-heading {
    color: var(--text-paper);
    font-family: var(--font-document);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.1em;
    margin: 0 0 10px;
    text-transform: uppercase;
  }

  .numeral {
    margin-right: 4px;
  }

  .fields {
    display: flex;
    flex-direction: column;
    gap: 7px;
    margin: 0;
  }

  .field-row {
    display: grid;
    gap: 4px 24px;
    grid-template-columns: minmax(0, 1fr);
  }

  dt {
    color: color-mix(in srgb, var(--text-paper) 58%, transparent);
    font-family: var(--font-document);
    font-size: 13px;
    line-height: 1.45;
  }

  dd {
    color: var(--text-paper);
    font-family: var(--font-document);
    font-size: 13.5px;
    line-height: 1.5;
    margin: 0;
    overflow-wrap: anywhere;
  }

  .multiline {
    white-space: pre-line;
  }

  @media (min-width: 1024px) {
    .field-row {
      align-items: baseline;
      grid-template-columns: minmax(150px, 42%) minmax(0, 1fr);
    }

    dd {
      text-align: right;
    }
  }
</style>
