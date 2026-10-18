<script lang="ts">
  import type { ReportCommentRound, ReportDetail } from '@par/shared';

  import BrandSeal from '$lib/components/BrandSeal.svelte';
  import { formatDate } from '$lib/format/datetime';
  import { STATUS_PRESENTATION } from '$lib/status/report-status';

  import {
    EMPTY_VALUE,
    attachmentGroups,
    documentTitle,
    facsimileSections,
    narrativeText,
    type FacsimileReferences,
  } from '../application/facsimile-document';
  import type { SignatureBlock } from '../application/facsimile-people';
  import ReviewHistory from './ReviewHistory.svelte';
  import SignatureBlockComponent from './SignatureBlock.svelte';
  import FacsimileSection from './FacsimileSection.svelte';

  /**
   * The paper form as the office knows it (UI spec §8.1). Cream stock, serif
   * type, ruled sections; the same markup renders the print preview with the
   * screen-only blocks removed. The document is always light, whatever the
   * application theme.
   */
  let {
    detail,
    references,
    rounds,
    block,
    print = false,
  }: {
    detail: ReportDetail;
    references: FacsimileReferences;
    rounds: ReportCommentRound[];
    block: SignatureBlock;
    print?: boolean;
  } = $props();

  const sections = $derived(facsimileSections(detail, references));
  const attachments = $derived(attachmentGroups(detail.attachments));
  const narrative = $derived(narrativeText(detail));
  const title = $derived(documentTitle(detail));
  const statusLabel = $derived(STATUS_PRESENTATION[detail.status].label);
</script>

<article class="facsimile-document" aria-labelledby="document-title">
  <header class="letterhead">
    <BrandSeal size={40} />
    <p class="office">OVPCASSS</p>
    <h2 class="doc-type">POST-ACTIVITY REPORT</h2>
    <div class="gold-rule" aria-hidden="true"></div>
    <p class="doc-title" id="document-title">{title}</p>
  </header>

  <dl class="reference-block">
    <div class="reference-item">
      <dt>Reference No.</dt>
      <dd class="mono">{detail.trackingNumber ?? EMPTY_VALUE}</dd>
    </div>
    {#if !print}
      <div class="reference-item screen-only">
        <dt>Status</dt>
        <dd>{statusLabel}</dd>
      </div>
    {/if}
    <div class="reference-item">
      <dt>Date received</dt>
      <dd>{detail.submittedAt ? formatDate(detail.submittedAt) : EMPTY_VALUE}</dd>
    </div>
    <div class="reference-item">
      <dt>Date completed</dt>
      <dd>{detail.completedAt ? formatDate(detail.completedAt) : EMPTY_VALUE}</dd>
    </div>
  </dl>

  {#each sections as section (section.id)}
    <FacsimileSection {section} />
  {/each}

  <section class="doc-section" id="narrative" aria-labelledby="narrative-heading">
    <h3 id="narrative-heading" class="section-heading">
      <span class="numeral">IV.</span>
      Narrative
    </h3>
    <p class="narrative">{narrative}</p>
  </section>

  <section class="doc-section" id="attachments" aria-labelledby="attachments-heading">
    <h3 id="attachments-heading" class="section-heading">
      <span class="numeral">V.</span>
      Attachments
    </h3>

    {#if attachments.length === 0}
      <p class="empty">No attachments.</p>
    {:else}
      <dl class="fields">
        {#each attachments as group (group.label)}
          <div class="field-row">
            <dt>{group.label}</dt>
            <dd class="multiline">{group.files.join('\n')}</dd>
          </div>
        {/each}
      </dl>
    {/if}
  </section>

  {#if !print}
    <div class="screen-only">
      <ReviewHistory {rounds} />
    </div>
  {/if}

  <SignatureBlockComponent {block} />
</article>

<style>
  .facsimile-document {
    background: var(--surface-paper);
    border: 1px solid color-mix(in srgb, var(--text-paper) 12%, transparent);
    border-radius: var(--radius-card);
    color: var(--text-paper);
    max-width: 820px;
    padding: 40px 44px 32px;
    width: 100%;
  }

  .letterhead {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .letterhead :global(.seal) {
    margin-bottom: 8px;
  }

  .office {
    font-family: var(--font-document);
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.18em;
    margin: 0;
  }

  .doc-type {
    color: var(--text-paper);
    font-family: var(--font-document);
    font-size: 19px;
    font-weight: 600;
    letter-spacing: 0.06em;
    margin: 0;
  }

  .gold-rule {
    background: var(--brand-gold-400);
    height: 2px;
    margin: 12px 0 14px;
    width: 100%;
  }

  .doc-title {
    font-family: var(--font-document);
    font-size: 20px;
    font-weight: 600;
    letter-spacing: -0.01em;
    line-height: 1.25;
    margin: 0 0 18px;
  }

  .reference-block {
    border-bottom: 1px solid color-mix(in srgb, var(--text-paper) 16%, transparent);
    display: grid;
    gap: 6px 24px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin: 0;
    padding-bottom: 12px;
  }

  .reference-item {
    display: flex;
    gap: 10px;
    justify-content: space-between;
  }

  .reference-item dt {
    color: color-mix(in srgb, var(--text-paper) 58%, transparent);
    font-family: var(--font-document);
    font-size: 12px;
  }

  .reference-item dd {
    font-family: var(--font-document);
    font-size: 12.5px;
    margin: 0;
    text-align: right;
  }

  .mono {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.01em;
  }

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

  .narrative {
    font-family: var(--font-document);
    font-size: 13.5px;
    line-height: 1.55;
    margin: 0;
    overflow-wrap: anywhere;
    white-space: pre-line;
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

  .field-row dt {
    color: color-mix(in srgb, var(--text-paper) 58%, transparent);
    font-family: var(--font-document);
    font-size: 13px;
  }

  .field-row dd {
    font-family: var(--font-document);
    font-size: 13.5px;
    line-height: 1.5;
    margin: 0;
    overflow-wrap: anywhere;
  }

  .multiline {
    white-space: pre-line;
  }

  .empty {
    color: color-mix(in srgb, var(--text-paper) 58%, transparent);
    font-family: var(--font-document);
    font-size: 13px;
    margin: 0;
  }

  @media (min-width: 1024px) {
    .field-row {
      align-items: baseline;
      grid-template-columns: minmax(150px, 42%) minmax(0, 1fr);
    }

    .field-row dd {
      text-align: right;
    }
  }

  @media (max-width: 1279px) {
    .facsimile-document {
      padding: 32px 28px 24px;
    }
  }

  @media print {
    .facsimile-document {
      border: 0;
      max-width: none;
      padding: 0;
    }
  }
</style>
