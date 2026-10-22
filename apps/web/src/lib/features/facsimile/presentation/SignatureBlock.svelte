<script lang="ts">
  import { formatDate } from '$lib/format/datetime';

  import type { SignatureBlock } from '../application/facsimile-people';

  /**
   * The signature block (UI spec §8.1): submitted by (name, date, and the
   * submitter's snapshotted image) and approved by (name, date, signature
   * image). A returned report keeps the approval side blank until it is approved
   * (open question 4). A missing image is a ruled line, never a placeholder.
   */
  let { block }: { block: SignatureBlock } = $props();
</script>

<section class="doc-section signatures" aria-labelledby="signatures-heading">
  <h3 id="signatures-heading" class="section-heading">Signatures</h3>

  <div class="signature-grid">
    <div class="signature">
      {#if block.submitterSignatureUrl}
        <img
          class="signature-image"
          src={block.submitterSignatureUrl}
          alt="Signature of {block.submittedBy}"
        />
      {:else}
        <div class="signature-line" aria-hidden="true"></div>
      {/if}
      <p class="signature-name">{block.submittedBy}</p>
      <p class="signature-label">Submitted by</p>
      {#if block.submittedAt}
        <p class="signature-date">{formatDate(block.submittedAt)}</p>
      {/if}
    </div>

    <div class="signature">
      {#if block.signatureUrl}
        <img
          class="signature-image"
          src={block.signatureUrl}
          alt="Signature of {block.approvedBy ?? 'the approving officer'}"
        />
      {:else}
        <div class="signature-line" aria-hidden="true"></div>
      {/if}
      {#if block.approvedBy}
        <p class="signature-name">{block.approvedBy}</p>
      {/if}
      <p class="signature-label">Approved by</p>
      {#if block.approvedAt}
        <p class="signature-date">{formatDate(block.approvedAt)}</p>
      {/if}
    </div>
  </div>
</section>

<style>
  .doc-section {
    border-top: 1px solid color-mix(in srgb, var(--text-paper) 16%, transparent);
    padding: 18px 0 4px;
  }

  .section-heading {
    color: var(--text-paper);
    font-family: var(--font-document);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.1em;
    margin: 0 0 20px;
    text-transform: uppercase;
  }

  .signature-grid {
    display: grid;
    gap: 32px;
    grid-template-columns: 1fr 1fr;
  }

  .signature {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .signature-line {
    border-bottom: 1px solid color-mix(in srgb, var(--text-paper) 55%, transparent);
    height: 34px;
    margin-bottom: 6px;
  }

  .signature-image {
    display: block;
    height: 44px;
    margin-bottom: 6px;
    max-width: 100%;
    object-fit: contain;
    object-position: left bottom;
  }

  .signature-name {
    color: var(--text-paper);
    font-family: var(--font-document);
    font-size: 13px;
    margin: 0;
  }

  .signature-label {
    color: color-mix(in srgb, var(--text-paper) 58%, transparent);
    font-family: var(--font-document);
    font-size: 12px;
    margin: 0;
  }

  .signature-date {
    color: color-mix(in srgb, var(--text-paper) 58%, transparent);
    font-family: var(--font-document);
    font-size: 11.5px;
    margin: 2px 0 0;
  }

  @media (max-width: 640px) {
    .signature-grid {
      grid-template-columns: 1fr;
    }
  }

  @media print {
    .signatures {
      break-inside: avoid;
      page-break-inside: avoid;
    }
  }
</style>
