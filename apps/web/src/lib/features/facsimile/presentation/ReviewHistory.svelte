<script lang="ts">
  import type { ReportCommentRound } from '@par/shared';

  import { roundAnchor, roundHeading } from '../application/facsimile-history';

  /**
   * Review comments live in the document, beneath the narrative (UI spec §7.7).
   * Each round is a group; the body is plain text with preserved paragraphs and
   * no composer, because comments are written in the decision drawer.
   */
  let { rounds }: { rounds: ReportCommentRound[] } = $props();
</script>

<section class="doc-section review-history" id="review-history" aria-labelledby="review-history-heading">
  <h3 id="review-history-heading" class="section-heading">
    <span class="numeral">VI.</span>
    Review history
  </h3>

  {#if rounds.length === 0}
    <p class="empty">No return comments.</p>
  {:else}
    <div class="rounds">
      {#each rounds as round (round.round)}
        <article class="round" id={roundAnchor(round)}>
          <h4>{roundHeading(round)}</h4>
          <p class="comment">{round.comments}</p>
        </article>
      {/each}
    </div>
  {/if}
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

  .rounds {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .round {
    border-left: 2px solid color-mix(in srgb, var(--brand-maroon-800) 55%, transparent);
    padding-left: 12px;
  }

  h4 {
    color: var(--brand-maroon-800);
    font-family: var(--font-document);
    font-size: 12.5px;
    font-weight: 600;
    margin: 0 0 4px;
  }

  .comment {
    color: var(--text-paper);
    font-family: var(--font-document);
    font-size: 13.5px;
    line-height: 1.55;
    margin: 0;
    overflow-wrap: anywhere;
    white-space: pre-line;
  }

  .empty {
    color: color-mix(in srgb, var(--text-paper) 58%, transparent);
    font-family: var(--font-document);
    font-size: 13px;
    margin: 0;
  }
</style>
